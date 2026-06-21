from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as FastResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, jwt, bcrypt, logging, uuid, asyncio, requests as req_lib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any, Annotated
from pydantic import BaseModel, BeforeValidator, Field
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Object Storage ---
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "medconsulta"
_storage_key = None

def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        # Fallback to local storage
        return "local"
    try:
        resp = req_lib.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.warning(f"Failed to init remote storage: {e}. Using local fallback.")
        return "local"

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if key == "local":
        local_path = Path("uploads") / path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        return {"path": path, "url": f"/api/logo"}
    
    resp = req_lib.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=60
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if key == "local":
        local_path = Path("uploads") / path
        if not local_path.exists():
            raise FileNotFoundError(f"Local file not found: {path}")
        content = local_path.read_bytes()
        # Guess content type from extension
        ext = local_path.suffix.lower()
        ct = "image/png"
        if ext == ".jpg" or ext == ".jpeg": ct = "image/jpeg"
        elif ext == ".gif": ct = "image/gif"
        elif ext == ".svg": ct = "image/svg+xml"
        elif ext == ".webp": ct = "image/webp"
        return content, ct

    resp = req_lib.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=30
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# --- ObjectId helper ---
def validate_oid(v: Any) -> str:
    if isinstance(v, ObjectId): return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v): return v
    raise ValueError(f"Invalid ObjectId: {v}")

PyObjectId = Annotated[str, BeforeValidator(validate_oid)]

# --- DB ---
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

# --- Auth helpers ---
JWT_ALG = "HS256"

def _secret():
    return os.environ["JWT_SECRET"]

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def make_access_token(uid: str, email: str) -> str:
    return jwt.encode(
        {"sub": uid, "email": email, "type": "access",
         "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        _secret(), algorithm=JWT_ALG)

def make_refresh_token(uid: str) -> str:
    return jwt.encode(
        {"sub": uid, "type": "refresh",
         "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        _secret(), algorithm=JWT_ALG)

async def current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "): token = h[7:]
    if not token:
        raise HTTPException(401, "No autenticado")
    try:
        p = jwt.decode(token, _secret(), algorithms=[JWT_ALG])
        if p.get("type") != "access":
            raise HTTPException(401, "Token inválido")
        u = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not u:
            raise HTTPException(401, "Usuario no encontrado")
        u["id"] = str(u.pop("_id"))
        u.pop("password_hash", None)
        return u
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")

def s(doc: dict) -> dict:
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

# --- App & CORS ---
app = FastAPI(title="MedConsulta API")

cors_str = os.environ.get("CORS_ORIGINS", "")
if cors_str and cors_str != "*":
    _cors_origins = [o.strip() for o in cors_str.split(",") if o.strip()]
else:
    _cors_origins = [os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

# ===================== AUTH =====================
auth = APIRouter(prefix="/auth", tags=["auth"])

# Cookie security: True for HTTPS production, False for local dev
_FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
COOKIE_SECURE = _FRONTEND_URL.startswith("https://")

class LoginReq(BaseModel):
    email: str
    password: str

@auth.post("/login")
async def login(req: LoginReq, resp: Response):
    u = await db.users.find_one({"email": req.email.lower().strip()})
    if not u or not verify_pw(req.password, u["password_hash"]):
        raise HTTPException(401, "Credenciales incorrectas")
    uid = str(u["_id"])
    at = make_access_token(uid, u["email"])
    rt = make_refresh_token(uid)
    resp.set_cookie("access_token", at,
                    httponly=True, secure=COOKIE_SECURE, samesite="none", max_age=28800, path="/")
    resp.set_cookie("refresh_token", rt,
                    httponly=True, secure=COOKIE_SECURE, samesite="none", max_age=604800, path="/")
    return {"id": uid, "name": u["name"], "email": u["email"],
            "role": u["role"], "specialization": u.get("specialization"),
            "access_token": at, "refresh_token": rt}

@auth.post("/logout")
async def logout(resp: Response):
    resp.delete_cookie("access_token", path="/")
    resp.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@auth.get("/me")
async def me(u: dict = Depends(current_user)):
    return u

@auth.post("/refresh")
async def refresh(request: Request, resp: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No autenticado")
    try:
        p = jwt.decode(token, _secret(), algorithms=[JWT_ALG])
        if p.get("type") != "refresh":
            raise HTTPException(401, "Token inválido")
        u = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not u:
            raise HTTPException(401, "Usuario no encontrado")
        at = make_access_token(str(u["_id"]), u["email"])
        resp.set_cookie("access_token", at, httponly=True, secure=COOKIE_SECURE, samesite="none", max_age=28800, path="/")
        return {"ok": True, "access_token": at}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")

# ===================== USERS =====================
users_r = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "doctor"
    specialization: Optional[str] = None
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None

@users_r.get("")
async def list_users(u: dict = Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Acceso denegado")
    result = await db.users.find({}, {"password_hash": 0}).to_list(200)
    return [s(r) for r in result]

@users_r.post("")
async def create_user(data: UserCreate, u: dict = Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Acceso denegado")
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(400, "Email ya registrado")
    doc = {"name": data.name, "email": data.email.lower(), "password_hash": hash_pw(data.password),
           "role": data.role, "specialization": data.specialization, "phone": data.phone,
           "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.users.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc

@users_r.put("/{uid}")
async def update_user(uid: str, data: UserUpdate, u: dict = Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Acceso denegado")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"_id": ObjectId(uid)}, {"$set": upd})
    return {"ok": True}

@users_r.delete("/{uid}")
async def delete_user(uid: str, u: dict = Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Acceso denegado")
    if uid == u["id"]:
        raise HTTPException(400, "No puedes eliminar tu propia cuenta")
    await db.users.delete_one({"_id": ObjectId(uid)})
    return {"ok": True}

# ===================== PATIENTS =====================
pts = APIRouter(prefix="/patients", tags=["patients"])

class PatientCreate(BaseModel):
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    notes: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    notes: Optional[str] = None

@pts.get("")
async def list_patients(search: Optional[str] = None, u: dict = Depends(current_user)):
    q = {}
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"phone": {"$regex": search, "$options": "i"}}]
    result = await db.patients.find(q).sort("name", 1).to_list(1000)
    return [s(p) for p in result]

@pts.post("")
async def create_patient(data: PatientCreate, u: dict = Depends(current_user)):
    doc = {**data.model_dump(), "created_by": u["id"],
           "created_by_name": u["name"],
           "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.patients.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    return doc

@pts.get("/{pid}")
async def get_patient(pid: str, u: dict = Depends(current_user)):
    p = await db.patients.find_one({"_id": ObjectId(pid)})
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
    return s(p)

@pts.put("/{pid}")
async def update_patient(pid: str, data: PatientUpdate, u: dict = Depends(current_user)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.patients.update_one({"_id": ObjectId(pid)}, {"$set": upd})
    return {"ok": True}

@pts.delete("/{pid}")
async def delete_patient(pid: str, u: dict = Depends(current_user)):
    if u["role"] not in ["admin", "doctor"]:
        raise HTTPException(403, "Acceso denegado")
    await db.patients.delete_one({"_id": ObjectId(pid)})
    return {"ok": True}

# ===================== PRESCRIPTIONS =====================
rxs = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

class MedItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    inventory_id: Optional[str] = None
    quantity_dispensed: Optional[int] = Field(default=None, ge=1)

class PrescriptionCreate(BaseModel):
    patient_id: str
    diagnosis: str
    medications: List[MedItem]
    notes: Optional[str] = None
    dispense_from_inventory: bool = True

class PrescriptionUpdate(BaseModel):
    diagnosis: Optional[str] = None
    medications: Optional[List[MedItem]] = None
    notes: Optional[str] = None
    status: Optional[str] = None

@rxs.get("")
async def list_prescriptions(patient_id: Optional[str] = None, u: dict = Depends(current_user)):
    q = {}
    if patient_id:
        q["patient_id"] = patient_id
    result = await db.prescriptions.find(q).sort("created_at", -1).to_list(1000)
    return [s(p) for p in result]

@rxs.post("")
async def create_prescription(data: PrescriptionCreate, u: dict = Depends(current_user)):
    if u["role"] not in ["admin", "doctor"]:
        raise HTTPException(403, "Solo médicos pueden crear recetas")
    p = await db.patients.find_one({"_id": ObjectId(data.patient_id)})
    if not p:
        raise HTTPException(404, "Paciente no encontrado")

    # Validate inventory stock before any DB write (fail fast, no partial state)
    dispense_plan = []  # list of (inventory_id, qty, item_name)
    if data.dispense_from_inventory:
        for m in data.medications:
            if m.inventory_id and m.quantity_dispensed and m.quantity_dispensed > 0:
                if not ObjectId.is_valid(m.inventory_id):
                    raise HTTPException(400, f"ID de inventario inválido para '{m.name}'")
                inv_doc = await db.inventory.find_one({"_id": ObjectId(m.inventory_id)})
                if not inv_doc:
                    raise HTTPException(404, f"Medicamento '{m.name}' no existe en inventario")
                if inv_doc.get("quantity", 0) < m.quantity_dispensed:
                    raise HTTPException(
                        400,
                        f"Stock insuficiente para '{inv_doc.get('name', m.name)}': "
                        f"disponible {inv_doc.get('quantity', 0)}, solicitado {m.quantity_dispensed}"
                    )
                dispense_plan.append((m.inventory_id, m.quantity_dispensed, inv_doc.get("name", m.name)))

    # Decrement stock atomically (per-item conditional update)
    decremented = []
    try:
        for inv_id, qty, name in dispense_plan:
            res = await db.inventory.update_one(
                {"_id": ObjectId(inv_id), "quantity": {"$gte": qty}},
                {"$inc": {"quantity": -qty},
                 "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            if res.modified_count == 0:
                # Concurrent change — rollback what we already decremented
                for r_id, r_qty, _ in decremented:
                    await db.inventory.update_one(
                        {"_id": ObjectId(r_id)}, {"$inc": {"quantity": r_qty}}
                    )
                raise HTTPException(400, f"Stock insuficiente para '{name}'. Vuelve a intentar.")
            decremented.append((inv_id, qty, name))
    except HTTPException:
        raise

    now = datetime.now(timezone.utc)
    doc = {"patient_id": data.patient_id, "patient_name": p["name"],
           "patient_dob": p.get("date_of_birth"),
           "doctor_id": u["id"], "doctor_name": u["name"],
           "doctor_specialization": u.get("specialization") or "Médico General",
           "diagnosis": data.diagnosis,
           "medications": [m.model_dump() for m in data.medications],
           "notes": data.notes, "status": "activa",
           "dispensed": bool(decremented),
           "dispensed_at": now.isoformat() if decremented else None,
           "date": now.strftime("%Y-%m-%d"),
           "created_at": now.isoformat()}
    r = await db.prescriptions.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    return doc

@rxs.get("/{rid}")
async def get_prescription(rid: str, u: dict = Depends(current_user)):
    r = await db.prescriptions.find_one({"_id": ObjectId(rid)})
    if not r:
        raise HTTPException(404, "Receta no encontrada")
    return s(r)

@rxs.put("/{rid}")
async def update_prescription(rid: str, data: PrescriptionUpdate, u: dict = Depends(current_user)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if "medications" in upd:
        upd["medications"] = [m.model_dump() if hasattr(m, "model_dump") else m for m in upd["medications"]]
    if upd:
        await db.prescriptions.update_one({"_id": ObjectId(rid)}, {"$set": upd})
    return {"ok": True}

# ===================== INVENTORY =====================
inv = APIRouter(prefix="/inventory", tags=["inventory"])

class InvCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    quantity: int
    unit: str = "unidades"
    min_stock: int = 10
    expiry_date: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None

class InvUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    min_stock: Optional[int] = None
    expiry_date: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None

@inv.get("")
async def list_inventory(search: Optional[str] = None, u: dict = Depends(current_user)):
    q = {}
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"generic_name": {"$regex": search, "$options": "i"}}]
    items = await db.inventory.find(q).sort("name", 1).to_list(1000)
    return [s(i) for i in items]

@inv.post("")
async def create_inv(data: InvCreate, u: dict = Depends(current_user)):
    if u["role"] not in ["admin", "doctor"]:
        raise HTTPException(403, "Acceso denegado")
    doc = {**data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.inventory.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    return doc

@inv.put("/{iid}")
async def update_inv(iid: str, data: InvUpdate, u: dict = Depends(current_user)):
    if u["role"] not in ["admin", "doctor"]:
        raise HTTPException(403, "Acceso denegado")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.inventory.update_one({"_id": ObjectId(iid)}, {"$set": upd})
    return {"ok": True}

@inv.delete("/{iid}")
async def delete_inv(iid: str, u: dict = Depends(current_user)):
    if u["role"] not in ["admin", "doctor"]:
        raise HTTPException(403, "Acceso denegado")
    await db.inventory.delete_one({"_id": ObjectId(iid)})
    return {"ok": True}

# ===================== DASHBOARD =====================
dash = APIRouter(prefix="/dashboard", tags=["dashboard"])

@dash.get("/stats")
async def stats(u: dict = Depends(current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tp = await db.patients.count_documents({})
    pt = await db.prescriptions.count_documents({"date": today})
    ls = await db.inventory.count_documents({"$expr": {"$lte": ["$quantity", "$min_stock"]}})
    tu = await db.users.count_documents({})
    recent = await db.prescriptions.find({}).sort("created_at", -1).to_list(5)
    return {"total_patients": tp, "prescriptions_today": pt,
            "low_stock_count": ls, "total_users": tu,
            "recent_prescriptions": [s(r) for r in recent]}

# ===================== APPOINTMENTS =====================
appt = APIRouter(prefix="/appointments", tags=["appointments"])

class ApptCreate(BaseModel):
    patient_id: str
    date: str        # YYYY-MM-DD
    time: str        # HH:MM
    duration: int = 30
    type: str = "consulta"
    notes: Optional[str] = None

class ApptUpdate(BaseModel):
    patient_id: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

@appt.get("")
async def list_appts(date: Optional[str] = None, month: Optional[str] = None,
                     u: dict = Depends(current_user)):
    q: dict = {}
    if date:
        q["date"] = date
    elif month:
        q["date"] = {"$regex": f"^{month}"}
    result = await db.appointments.find(q).sort([("date", 1), ("time", 1)]).to_list(500)
    return [s(r) for r in result]

@appt.post("")
async def create_appt(data: ApptCreate, u: dict = Depends(current_user)):
    p = await db.patients.find_one({"_id": ObjectId(data.patient_id)})
    if not p:
        raise HTTPException(404, "Paciente no encontrado")
        
    doc = {"patient_id": data.patient_id, "patient_name": p["name"],
           "doctor_id": u["id"], "doctor_name": u["name"],
           "date": data.date, "time": data.time, "duration": data.duration,
           "type": data.type, "status": "programada", "notes": data.notes,
           "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.appointments.insert_one(doc)
    doc["id"] = str(r.inserted_id); doc.pop("_id", None)
    return doc

@appt.get("/{aid}")
async def get_appt(aid: str, u: dict = Depends(current_user)):
    a = await db.appointments.find_one({"_id": ObjectId(aid)})
    if not a: raise HTTPException(404, "Cita no encontrada")
    return s(a)

@appt.put("/{aid}")
async def update_appt(aid: str, data: ApptUpdate, u: dict = Depends(current_user)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if "patient_id" in upd:
        p = await db.patients.find_one({"_id": ObjectId(upd["patient_id"])})
        if p: upd["patient_name"] = p["name"]
    if upd:
        await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": upd})
    return {"ok": True}

@appt.delete("/{aid}")
async def delete_appt(aid: str, u: dict = Depends(current_user)):
    await db.appointments.delete_one({"_id": ObjectId(aid)})
    return {"ok": True}


# ===================== SETTINGS =====================
cfg = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_CFG = {
    "clinic_name": "Consultorio Médico",
    "clinic_specialty": "Medicina General",
    "clinic_address": "",
    "clinic_phone": "",
    "clinic_email": "",
    "clinic_logo_url": "",
    "license_number": ""
}

class CfgUpdate(BaseModel):
    clinic_name: Optional[str] = None
    clinic_specialty: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    clinic_logo_url: Optional[str] = None
    clinic_logo_path: Optional[str] = None
    license_number: Optional[str] = None

@cfg.get("")
async def get_cfg(u: dict = Depends(current_user)):
    setting = await db.settings.find_one({}, {"_id": 0})
    if not setting:
        return {**DEFAULT_CFG, "has_logo": False}
    setting.pop("_id", None)
    has_logo = bool(setting.get("clinic_logo_path"))
    result = {**DEFAULT_CFG, **setting, "has_logo": has_logo}
    # Expose logo as relative URL if available
    if has_logo:
        result["clinic_logo_url"] = "/api/logo"
    return result

@cfg.put("")
async def update_cfg(data: CfgUpdate, u: dict = Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Solo administradores pueden cambiar la configuración")
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one({}, {"$set": upd}, upsert=True)
    return {"ok": True}

# ===================== LOGO UPLOAD =====================
upload_r = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
MIME_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
            "image/webp": "webp", "image/svg+xml": "svg"}

@upload_r.post("/logo")
async def upload_logo(file: UploadFile = File(...), u: dict = Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Solo administradores pueden cambiar el logo")
    ct = file.content_type or "image/png"
    if ct not in ALLOWED_TYPES:
        raise HTTPException(400, "Formato no permitido. Use JPG, PNG, GIF, WEBP o SVG")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "El archivo no puede superar 5MB")
    ext = MIME_EXT.get(ct, "png")
    path = f"{APP_NAME}/logos/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, ct)
        # Save path in settings
        await db.settings.update_one(
            {}, {"$set": {"clinic_logo_path": result["path"],
                          "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"ok": True, "logo_url": "/api/logo"}
    except Exception as e:
        logger.error(f"Logo upload failed: {e}")
        raise HTTPException(500, "Error al subir la imagen. Intente de nuevo.")

# Public endpoint - no auth needed for logo display
@app.get("/api/logo")
async def get_logo():
    setting = await db.settings.find_one({}, {"clinic_logo_path": 1})
    if not setting or not setting.get("clinic_logo_path"):
        raise HTTPException(404, "No hay logo configurado")
    try:
        content, content_type = get_object(setting["clinic_logo_path"])
        return FastResponse(content=content, media_type=content_type,
                            headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    except Exception as e:
        logger.error(f"Logo fetch failed: {e}")
        raise HTTPException(404, "Logo no disponible")

# ===================== ASSEMBLE =====================
for router in [auth, users_r, pts, rxs, inv, dash, cfg, upload_r, appt]:
    api.include_router(router)
app.include_router(api)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.patients.create_index([("name", 1)])
    await db.prescriptions.create_index([("patient_id", 1)])
    await db.inventory.create_index([("name", 1)])
    await db.appointments.create_index([("date", 1), ("doctor_id", 1)])

    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (non-fatal): {e}")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@medconsulta.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "name": "Administrador", "email": admin_email,
            "password_hash": hash_pw(admin_pw), "role": "admin",
            "specialization": "Administración del Sistema",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_pw(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                   {"$set": {"password_hash": hash_pw(admin_pw)}})

    creds = Path("/app/memory/test_credentials.md")
    try:
        creds.parent.mkdir(parents=True, exist_ok=True)
        creds.write_text(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_pw}
- Role: admin

## API Endpoints
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout
- GET /api/patients
- POST /api/patients
- GET /api/prescriptions
- POST /api/prescriptions
- GET /api/inventory
- POST /api/inventory
- GET /api/appointments?date=YYYY-MM-DD or ?month=YYYY-MM
- POST /api/appointments
- PUT /api/appointments/{{id}}
- DELETE /api/appointments/{{id}}
- GET /api/dashboard/stats
- GET /api/users (admin only)
""")
    except Exception as e:
        logger.warning(f"Could not write test_credentials.md (non-fatal): {e}")

    logger.info("Startup complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()
