"""Backend tests for MedConsulta API"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Shared session with cookies
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

ADMIN_EMAIL = "admin@medconsulta.com"
ADMIN_PASSWORD = "Admin123!"

# IDs created during tests
created_patient_id = None
created_prescription_id = None
created_inventory_id = None
created_user_id = None


class TestAuth:
    """Auth endpoint tests"""

    def test_login_success(self):
        resp = session.post(f"{BASE_URL}/api/auth/login",
                            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print("PASS: login success")

    def test_me(self):
        resp = session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == ADMIN_EMAIL
        print("PASS: /me works")

    def test_login_bad_credentials(self):
        s2 = requests.Session()
        resp = s2.post(f"{BASE_URL}/api/auth/login",
                       json={"email": "wrong@test.com", "password": "wrongpass"})
        assert resp.status_code == 401
        print("PASS: bad credentials returns 401")


class TestDashboard:
    def test_stats(self):
        resp = session.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_patients" in data
        assert "prescriptions_today" in data
        assert "low_stock_count" in data
        assert "total_users" in data
        print(f"PASS: dashboard stats: {data}")


class TestPatients:
    def test_create_patient(self):
        global created_patient_id
        resp = session.post(f"{BASE_URL}/api/patients", json={
            "name": "TEST_Juan Garcia",
            "date_of_birth": "1985-03-15",
            "gender": "masculino",
            "phone": "555-1234"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Juan Garcia"
        assert "id" in data
        created_patient_id = data["id"]
        print(f"PASS: patient created {created_patient_id}")

    def test_list_patients(self):
        resp = session.get(f"{BASE_URL}/api/patients")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        names = [p["name"] for p in data]
        assert "TEST_Juan Garcia" in names
        print("PASS: patient list contains created patient")

    def test_search_patients(self):
        resp = session.get(f"{BASE_URL}/api/patients?search=TEST_Juan")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        print("PASS: search works")

    def test_get_patient(self):
        assert created_patient_id
        resp = session.get(f"{BASE_URL}/api/patients/{created_patient_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Juan Garcia"
        print("PASS: get patient by id")


class TestPrescriptions:
    def test_create_prescription(self):
        global created_prescription_id
        assert created_patient_id
        resp = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "Hipertensión arterial",
            "medications": [
                {"name": "Enalapril", "dosage": "10mg", "frequency": "1 vez al día",
                 "duration": "30 días", "instructions": "Con agua"}
            ],
            "notes": "Control en 1 mes"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["diagnosis"] == "Hipertensión arterial"
        assert len(data["medications"]) == 1
        created_prescription_id = data["id"]
        print(f"PASS: prescription created {created_prescription_id}")

    def test_list_prescriptions(self):
        resp = session.get(f"{BASE_URL}/api/prescriptions")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: prescriptions list has {len(data)} items")

    def test_get_prescription(self):
        assert created_prescription_id
        resp = session.get(f"{BASE_URL}/api/prescriptions/{created_prescription_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created_prescription_id
        print("PASS: get prescription by id")

    def test_list_prescriptions_by_patient(self):
        assert created_patient_id
        resp = session.get(f"{BASE_URL}/api/prescriptions?patient_id={created_patient_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["patient_id"] == created_patient_id
        print("PASS: prescriptions filtered by patient")


class TestInventory:
    def test_create_inventory(self):
        global created_inventory_id
        resp = session.post(f"{BASE_URL}/api/inventory", json={
            "name": "TEST_Paracetamol 500mg",
            "category": "Analgésico",
            "quantity": 100,
            "unit": "tabletas",
            "min_stock": 20
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Paracetamol 500mg"
        created_inventory_id = data["id"]
        print(f"PASS: inventory item created {created_inventory_id}")

    def test_list_inventory(self):
        resp = session.get(f"{BASE_URL}/api/inventory")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        names = [i["name"] for i in data]
        assert "TEST_Paracetamol 500mg" in names
        print("PASS: inventory list works")

    def test_update_inventory(self):
        assert created_inventory_id
        resp = session.put(f"{BASE_URL}/api/inventory/{created_inventory_id}",
                           json={"quantity": 50})
        assert resp.status_code == 200
        print("PASS: inventory update")


class TestUsers:
    def test_list_users(self):
        resp = session.get(f"{BASE_URL}/api/users")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        emails = [u["email"] for u in data]
        assert ADMIN_EMAIL in emails
        print(f"PASS: users list has {len(data)} users")

    def test_create_user(self):
        global created_user_id
        resp = session.post(f"{BASE_URL}/api/users", json={
            "name": "TEST_Dr. Lopez",
            "email": "test_dr_lopez@medconsulta.com",
            "password": "Doctor123!",
            "role": "doctor",
            "specialization": "Medicina General"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "doctor"
        created_user_id = data["id"]
        print(f"PASS: user created {created_user_id}")


# ============= APPOINTMENTS =============
created_appt_id = None


class TestAppointments:
    def test_unauth_returns_401(self):
        s2 = requests.Session()
        resp = s2.get(f"{BASE_URL}/api/appointments")
        assert resp.status_code == 401
        print("PASS: appointments require auth")

    def test_create_appointment(self):
        global created_appt_id
        assert created_patient_id
        resp = session.post(f"{BASE_URL}/api/appointments", json={
            "patient_id": created_patient_id,
            "date": "2026-05-15",
            "time": "09:30",
            "duration": 30,
            "type": "consulta",
            "notes": "TEST appointment"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["patient_id"] == created_patient_id
        assert data["date"] == "2026-05-15"
        assert data["time"] == "09:30"
        assert data["status"] == "programada"
        assert "doctor_name" in data and data["doctor_name"]
        assert "id" in data and "_id" not in data
        created_appt_id = data["id"]
        print(f"PASS: appointment created {created_appt_id}")

    def test_create_appt_invalid_patient_returns_404(self):
        resp = session.post(f"{BASE_URL}/api/appointments", json={
            "patient_id": "000000000000000000000000",
            "date": "2026-05-15", "time": "11:00",
            "duration": 30, "type": "consulta"
        })
        assert resp.status_code == 404
        print("PASS: invalid patient_id returns 404")

    def test_list_by_date(self):
        resp = session.get(f"{BASE_URL}/api/appointments?date=2026-05-15")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(a["id"] == created_appt_id for a in data)
        for a in data:
            assert "_id" not in a
        print(f"PASS: list by date returned {len(data)} appts")

    def test_list_by_month(self):
        resp = session.get(f"{BASE_URL}/api/appointments?month=2026-05")
        assert resp.status_code == 200
        data = resp.json()
        assert any(a["id"] == created_appt_id for a in data)
        print(f"PASS: list by month returned {len(data)} appts")

    def test_get_appointment(self):
        assert created_appt_id
        resp = session.get(f"{BASE_URL}/api/appointments/{created_appt_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created_appt_id
        assert "_id" not in data
        print("PASS: get appointment by id")

    def test_update_appointment_status(self):
        assert created_appt_id
        resp = session.put(f"{BASE_URL}/api/appointments/{created_appt_id}",
                           json={"status": "completada"})
        assert resp.status_code == 200
        # Verify persistence
        get_resp = session.get(f"{BASE_URL}/api/appointments/{created_appt_id}")
        assert get_resp.json()["status"] == "completada"
        print("PASS: appointment status updated and persisted")

    def test_delete_appointment(self):
        assert created_appt_id
        resp = session.delete(f"{BASE_URL}/api/appointments/{created_appt_id}")
        assert resp.status_code == 200
        # Verify deletion
        get_resp = session.get(f"{BASE_URL}/api/appointments/{created_appt_id}")
        assert get_resp.status_code == 404
        print("PASS: appointment deleted")



# ============= DISPENSING / Prescription -> Inventory link =============
disp_inv_a = None  # high stock
disp_inv_b = None  # low stock for rollback
disp_rx_ids = []


class TestDispensing:
    """Tests for new feature: linking inventory items in prescriptions and stock decrement."""

    def _create_inv(self, name, qty, min_stock=5):
        r = session.post(f"{BASE_URL}/api/inventory", json={
            "name": name, "generic_name": name + " gen",
            "category": "Test", "quantity": qty, "unit": "tabletas", "min_stock": min_stock
        })
        assert r.status_code == 200, r.text
        return r.json()

    def test_setup_inventory_items(self):
        global disp_inv_a, disp_inv_b
        a = self._create_inv("TEST_DISP_MedA", 50)
        b = self._create_inv("TEST_DISP_MedB", 3)  # used to test rollback
        disp_inv_a = a["id"]
        disp_inv_b = b["id"]
        assert disp_inv_a and disp_inv_b
        print(f"PASS: inv A={disp_inv_a} (qty=50), B={disp_inv_b} (qty=3)")

    def test_unauth_returns_401(self):
        s2 = requests.Session()
        r = s2.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id or "x",
            "diagnosis": "x", "medications": []
        })
        assert r.status_code == 401
        print("PASS: prescriptions require auth")

    def test_dispense_decrements_stock_atomically(self):
        assert created_patient_id and disp_inv_a
        before = session.get(f"{BASE_URL}/api/inventory").json()
        qa_before = next(i["quantity"] for i in before if i["id"] == disp_inv_a)

        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST dispensing decrement",
            "dispense_from_inventory": True,
            "medications": [{
                "name": "TEST_DISP_MedA", "dosage": "500mg",
                "frequency": "Cada 8 horas", "duration": "7 días",
                "inventory_id": disp_inv_a, "quantity_dispensed": 10
            }]
        })
        assert r.status_code == 200, r.text
        rx = r.json()
        disp_rx_ids.append(rx["id"])
        assert "_id" not in rx
        assert isinstance(rx["id"], str)
        assert rx["dispensed"] is True
        assert rx["dispensed_at"] and "T" in rx["dispensed_at"]
        assert rx["medications"][0]["inventory_id"] == disp_inv_a
        assert rx["medications"][0]["quantity_dispensed"] == 10

        # Verify stock decremented
        after = session.get(f"{BASE_URL}/api/inventory").json()
        qa_after = next(i["quantity"] for i in after if i["id"] == disp_inv_a)
        assert qa_after == qa_before - 10, f"expected {qa_before-10}, got {qa_after}"
        print(f"PASS: stock A {qa_before}->{qa_after}")

    def test_insufficient_stock_returns_400(self):
        assert disp_inv_a
        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST insufficient",
            "dispense_from_inventory": True,
            "medications": [{
                "name": "TEST_DISP_MedA", "dosage": "1", "frequency": "X", "duration": "1d",
                "inventory_id": disp_inv_a, "quantity_dispensed": 9999
            }]
        })
        assert r.status_code == 400, r.text
        assert "stock insuficiente" in r.json()["detail"].lower()
        print(f"PASS: insufficient -> 400: {r.json()['detail']}")

    def test_invalid_inventory_id_returns_400(self):
        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST bad id",
            "dispense_from_inventory": True,
            "medications": [{
                "name": "x", "dosage": "1", "frequency": "X", "duration": "1d",
                "inventory_id": "not-a-valid-hex", "quantity_dispensed": 1
            }]
        })
        assert r.status_code == 400
        assert "inválido" in r.json()["detail"].lower() or "invalido" in r.json()["detail"].lower()
        print(f"PASS: invalid inventory_id -> 400")

    def test_nonexistent_inventory_id_returns_404(self):
        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST not exist",
            "dispense_from_inventory": True,
            "medications": [{
                "name": "x", "dosage": "1", "frequency": "X", "duration": "1d",
                "inventory_id": "000000000000000000000000", "quantity_dispensed": 1
            }]
        })
        assert r.status_code == 404
        assert "no existe en inventario" in r.json()["detail"].lower()
        print("PASS: nonexistent inventory -> 404")

    def test_dispense_false_does_not_decrement(self):
        assert disp_inv_a
        before = next(i["quantity"] for i in session.get(f"{BASE_URL}/api/inventory").json()
                      if i["id"] == disp_inv_a)
        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST no dispense",
            "dispense_from_inventory": False,
            "medications": [{
                "name": "TEST_DISP_MedA", "dosage": "1", "frequency": "X", "duration": "1d",
                "inventory_id": disp_inv_a, "quantity_dispensed": 5
            }]
        })
        assert r.status_code == 200, r.text
        rx = r.json()
        disp_rx_ids.append(rx["id"])
        assert rx["dispensed"] is False
        assert rx["dispensed_at"] is None
        after = next(i["quantity"] for i in session.get(f"{BASE_URL}/api/inventory").json()
                     if i["id"] == disp_inv_a)
        assert after == before, f"stock changed: {before}->{after}"
        print(f"PASS: dispense=false keeps stock {after}")

    def test_free_text_no_inventory(self):
        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST free text",
            "dispense_from_inventory": True,
            "medications": [{
                "name": "Custom medicine", "dosage": "1", "frequency": "X", "duration": "1d"
            }]
        })
        assert r.status_code == 200, r.text
        rx = r.json()
        disp_rx_ids.append(rx["id"])
        assert rx["dispensed"] is False  # nothing was decremented
        assert rx["dispensed_at"] is None
        print("PASS: free-text medication works without touching inventory")

    def test_rollback_on_partial_failure(self):
        """If 2 meds: first succeeds, second fails (insufficient stock) -> NO stock changes."""
        assert disp_inv_a and disp_inv_b
        inv = session.get(f"{BASE_URL}/api/inventory").json()
        qa_before = next(i["quantity"] for i in inv if i["id"] == disp_inv_a)
        qb_before = next(i["quantity"] for i in inv if i["id"] == disp_inv_b)

        r = session.post(f"{BASE_URL}/api/prescriptions", json={
            "patient_id": created_patient_id,
            "diagnosis": "TEST rollback",
            "dispense_from_inventory": True,
            "medications": [
                {"name": "TEST_DISP_MedA", "dosage": "1", "frequency": "X", "duration": "1d",
                 "inventory_id": disp_inv_a, "quantity_dispensed": 5},
                {"name": "TEST_DISP_MedB", "dosage": "1", "frequency": "X", "duration": "1d",
                 "inventory_id": disp_inv_b, "quantity_dispensed": 9999}  # FAIL
            ]
        })
        assert r.status_code == 400, r.text

        inv2 = session.get(f"{BASE_URL}/api/inventory").json()
        qa_after = next(i["quantity"] for i in inv2 if i["id"] == disp_inv_a)
        qb_after = next(i["quantity"] for i in inv2 if i["id"] == disp_inv_b)
        # Pre-validation prevents any decrement, but even if reached decrement loop, rollback restores
        assert qa_after == qa_before, f"A changed: {qa_before}->{qa_after}"
        assert qb_after == qb_before, f"B changed: {qb_before}->{qb_after}"
        print(f"PASS: rollback ok A={qa_after} B={qb_after}")

    def test_response_excludes_underscore_id(self):
        # Get list and verify shape
        r = session.get(f"{BASE_URL}/api/prescriptions")
        assert r.status_code == 200
        for rx in r.json()[:5]:
            assert "_id" not in rx
            assert "id" in rx and isinstance(rx["id"], str)
        print("PASS: prescriptions never expose _id")

    def test_cleanup_dispensing(self):
        if disp_inv_a:
            session.delete(f"{BASE_URL}/api/inventory/{disp_inv_a}")
        if disp_inv_b:
            session.delete(f"{BASE_URL}/api/inventory/{disp_inv_b}")
        print("PASS: dispensing cleanup done")


class TestCleanup:
    def test_cleanup(self):
        """Delete test data"""

        if created_inventory_id:
            session.delete(f"{BASE_URL}/api/inventory/{created_inventory_id}")
        if created_patient_id:
            session.delete(f"{BASE_URL}/api/patients/{created_patient_id}")
        if created_user_id:
            session.delete(f"{BASE_URL}/api/users/{created_user_id}")
        print("PASS: cleanup done")
