import { X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { cn } from "@/lib/utils";

type ModalProps = {
  className?: string;
  children: React.ReactNode;
  clickOutsideToClose?: boolean;
  isOpen: boolean;
  onClose: () => void;
};

export const Modal = ({
  className,
  children,
  clickOutsideToClose = false,
  isOpen,
  onClose,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !clickOutsideToClose) return;

    const handleClick = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Defer so the click that opened the modal does not close it immediately.
    const frame = requestAnimationFrame(() => {
      document.addEventListener("click", handleClick);
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", handleClick);
    };
  }, [isOpen, clickOutsideToClose, onClose]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])',
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex h-screen w-full items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="fade absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={clickOutsideToClose ? onClose : undefined}
      />

      <Card
        className={cn("reveal reveal-sm relative z-[101] max-w-md", className)}
        ref={modalRef}
        tabIndex={-1}
      >
        {children}

        <Button
          aria-label="Close Modal"
          shape="square"
          className="absolute top-2 right-2"
          onClick={onClose}
          variant="ghost"
        >
          <X size={16} />
        </Button>
      </Card>
    </div>,
    document.body,
  );
};
