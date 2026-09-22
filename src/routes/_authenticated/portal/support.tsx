import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeading, PanelCard } from "@/components/portal/ui";
import { useSupportThread } from "@/hooks/usePortal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Support | BKS Customer Portal" },
      {
        name: "description",
        content:
          "Chat directly with the BKS concierge team about your stays, transfers and service requests.",
      },
      { property: "og:title", content: "BKS Portal Support" },
      {
        property: "og:description",
        content: "Message the BKS team and get live answers about your bookings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { messages, send, userId } = useSupportThread();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const rows = messages.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text && !file) return;
    send.mutate(
      { body: text, attachment: file },
      {
        onSuccess: () => {
          setBody("");
          setFile(null);
          if (fileInput.current) fileInput.current.value = "";
        },
        onError: (error: Error) =>
          toast.error("Message not sent", { description: error.message }),
      },
    );
  };

  return (
    <div className="space-y-7">
      <PageHeading
        title="Support"
        description="Message the BKS team. Replies appear here instantly."
      />

      <PanelCard className="flex h-[60vh] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading conversation…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Send the first message and our team will respond shortly.
            </p>
          ) : (
            rows.map((message) => {
              const mine = message.sender_id === userId;
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-2.5 text-sm shadow-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}
                    {message.attachment_name ? (
                      <p className="mt-1 text-xs opacity-80">📎 {message.attachment_name}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t p-3">
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach a file"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip />
          </Button>
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={file ? `Attaching ${file.name}…` : "Type your message"}
            aria-label="Message"
          />
          <Button type="submit" variant="gold" disabled={send.isPending} aria-label="Send message">
            <Send />
          </Button>
        </form>
      </PanelCard>
    </div>
  );
}
