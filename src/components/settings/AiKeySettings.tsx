import { useEffect, useState } from "react";
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/Input";
import { Modal } from "@/components/modal/Modal";
import { apiKeyInputClassName, apiKeyInputProps } from "@/lib/api-key-input";
import { cn } from "@/lib/utils";

export default function AiKeySettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApiKey("");
    setError(null);
    setSuccess(false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const resp = await fetch("/auth/ai-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await resp.json<{ success: boolean; message?: string }>();

      if (data.success) {
        setSuccess(true);
        setApiKey("");
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        setError(data.message || "Failed to update API key.");
      }
    } catch {
      setError("Failed to update API key. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setApiKey("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} clickOutsideToClose>
      <h3 className="font-semibold text-lg mb-2 pr-8">Update API key</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter a new Google AI API key. It replaces your saved key and is stored
        encrypted.
      </p>
      <form autoComplete="off" onSubmit={handleSubmit}>
        <Input
          {...apiKeyInputProps}
          placeholder="New Google AI API key"
          onValueChange={setApiKey}
          className={cn("mb-3 w-full", apiKeyInputClassName)}
        />
        {error && <div className="text-red-500 mb-3 text-xs">{error}</div>}
        {success && (
          <div className="text-green-600 mb-3 text-xs">API key updated.</div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={!apiKey.trim() || saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
