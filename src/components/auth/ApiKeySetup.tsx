import { useState } from "react";
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Input } from "@/components/input/Input";
import { apiKeyInputClassName, apiKeyInputProps } from "@/lib/api-key-input";
import { cn } from "@/lib/utils";

export default function ApiKeySetup({
  onSaved,
  onLogout,
}: {
  onSaved: () => void;
  onLogout: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const resp = await fetch("/auth/ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await resp.json<{ success: boolean; message?: string }>();

      if (data.success) {
        onSaved();
      } else {
        setError(data.message || "Failed to save API key.");
      }
    } catch {
      setError("Failed to save API key. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full">
      <Card className="p-6 w-full max-w-sm">
        <h2 className="mb-2 text-lg font-bold text-center">
          Add your Google AI API key
        </h2>
        <p className="mb-4 text-sm text-muted-foreground text-center">
          Your key is encrypted and stored for your account only. Get one from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F48120] hover:underline"
          >
            Google AI Studio
          </a>
          .
        </p>
        <form autoComplete="off" onSubmit={handleSubmit}>
          <Input
            {...apiKeyInputProps}
            placeholder="Google AI API key"
            onValueChange={setApiKey}
            className={cn("mb-3 w-full", apiKeyInputClassName)}
          />
          <Button
            variant="primary"
            className="w-full"
            type="submit"
            disabled={!apiKey.trim() || saving}
          >
            {saving ? "Saving..." : "Save and continue"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
        {error && <div className="text-red-500 mt-3 text-xs">{error}</div>}
      </Card>
    </div>
  );
}
