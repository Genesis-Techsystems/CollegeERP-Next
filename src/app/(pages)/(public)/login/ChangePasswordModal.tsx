"use client";

/**
 * Angular `login/change-password-modal` — student first-login password change.
 */
import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetStudentPassword } from "@/services";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

const schema = z.object({
  password: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(1, "New password is required"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
});

type FormValues = z.infer<typeof schema>;

export type ChangePasswordModalProps = {
  open: boolean;
  usernameOrEmail: string;
  currentPassword: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ChangePasswordModal({
  open,
  usernameOrEmail,
  currentPassword,
  onClose,
  onSaved,
}: Readonly<ChangePasswordModalProps>) {
  const [hide, setHide] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: currentPassword,
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setHide(true);
    reset({
      password: currentPassword,
      newPassword: "",
      confirmPassword: "",
    });
  }, [currentPassword, open, reset]);

  async function onSubmit(values: FormValues) {
    if (values.password !== currentPassword) {
      toastInfo("Old password is not matched.");
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      toastInfo("New Password and Confirm Password should be same.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetStudentPassword({
        userName: usernameOrEmail,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toastSuccess(result.message);
      onSaved();
    } catch (err) {
      toastError(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Change Password"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
      showHeaderDivider
    >
      <PasswordField
        id="oldPassword"
        label="Old Password"
        hide={hide}
        onToggleHide={() => setHide((v) => !v)}
        error={errors.password?.message}
        registration={register("password")}
      />
      <PasswordField
        id="newPassword"
        label="New Password"
        hide={hide}
        onToggleHide={() => setHide((v) => !v)}
        error={errors.newPassword?.message}
        registration={register("newPassword")}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm Password"
        hide={hide}
        onToggleHide={() => setHide((v) => !v)}
        error={errors.confirmPassword?.message}
        registration={register("confirmPassword")}
      />
    </FormModal>
  );
}

function PasswordField({
  id,
  label,
  hide,
  onToggleHide,
  error,
  registration,
}: {
  id: string;
  label: string;
  hide: boolean;
  onToggleHide: () => void;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={hide ? "password" : "text"}
          autoComplete="new-password"
          className="pr-10"
          {...registration}
        />
        <button
          type="button"
          onClick={onToggleHide}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label={hide ? "Show password" : "Hide password"}
          tabIndex={-1}
        >
          {hide ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
