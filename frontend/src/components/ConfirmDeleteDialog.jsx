import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Progress } from "./ui/progress";

export default function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  countdownSeconds = 3,
}) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(countdownSeconds);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownSeconds]);

  const handleConfirm = () => {
    if (timeLeft > 0) return;
    onConfirm();
    onOpenChange(false);
  };

  const progressValue = (timeLeft / countdownSeconds) * 100;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900" style={{ fontFamily: "Manrope" }}>
            {title || "¿Confirmar eliminación?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500">
            {description || "Esta acción es destructiva y no se puede deshacer de ninguna forma."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {timeLeft > 0 && (
          <div className="space-y-2 py-3">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Verificando acción de eliminación...</span>
              <span className="tabular-nums font-semibold text-amber-600">Espera {timeLeft}s</span>
            </div>
            <Progress value={progressValue} className="h-1.5 bg-slate-100" />
          </div>
        )}

        <AlertDialogFooter className="mt-4 gap-2 flex-wrap">
          <AlertDialogCancel
            className="border-slate-300 text-slate-700 h-9 active:scale-95 transition-transform"
            data-testid="delete-confirm-cancel"
          >
            Cancelar
          </AlertDialogCancel>
          <button
            onClick={handleConfirm}
            disabled={timeLeft > 0}
            className={`h-9 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-100 flex items-center justify-center gap-1.5 ${
              timeLeft > 0
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white shadow active:scale-[0.98]"
            }`}
            data-testid="delete-confirm-action"
          >
            {timeLeft > 0 ? `Eliminar (${timeLeft})` : "Confirmar Eliminación"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
