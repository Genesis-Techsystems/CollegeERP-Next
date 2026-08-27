"use client";

/**
 * Angular `profile-dialog` — Change Password on my-profile.
 * On success: PUT User, then logout → login (Angular parity).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout, updateProfileUserPassword } from "@/services";
import type { ProfileLoginUser } from "@/services";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

const schema = z.object({
  password: z.string().min(1, "Old password is required"),
  nPassword: z.string().min(1, "New password is required"),
  cPassword: z.string().min(1, "Confirm password is required"),
});

type FormValues = z.infer<typeof schema>;

export type ProfileChangePasswordDialogProps = {
  open: boolean;
  loginUser: ProfileLoginUser | null;
  onClose: () => void;
};

export function ProfileChangePasswordDialog({
  open,
  loginUser,
  onClose,
}: Readonly<ProfileChangePasswordDialogProps>) {
  const router = useRouter();
  const [hide, setHide] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentPassword = String(loginUser?.password ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: currentPassword,
      nPassword: "",
      cPassword: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setHide(true);
    reset({
      password: currentPassword,
      nPassword: "",
      cPassword: "",
    });
  }, [currentPassword, open, reset]);

  async function onSubmit(values: FormValues) {
    if (!loginUser?.userId) return;
    if (values.password !== currentPassword) {
      toastInfo("Old password is not matched.");
      return;
    }
    if (values.nPassword !== values.cPassword) {
      toastInfo("New Password and Confirm Password should be same.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ProfileLoginUser = {
        ...loginUser,
        password: values.nPassword,
      };
      await updateProfileUserPassword(payload);
      toastSuccess("Password updated successfully.");
      onClose();
      await logout().catch(() => undefined);
      router.replace("/login");
    } catch (err) {
      toastError(err, "Failed to update password");
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
      submitLabel="Update"
      cancelLabel="Cancel"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-old-password">Old Password</Label>
          <div className="relative">
            <Input
              id="profile-old-password"
              type={hide ? "password" : "text"}
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setHide((v) => !v)}
              aria-label={hide ? "Show password" : "Hide password"}
            >
              {hide ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-new-password">New Password</Label>
          <Input
            id="profile-new-password"
            type={hide ? "password" : "text"}
            autoComplete="new-password"
            {...register("nPassword")}
          />
          {errors.nPassword ? (
            <p className="text-xs text-destructive">{errors.nPassword.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-confirm-password">Confirm Password</Label>
          <Input
            id="profile-confirm-password"
            type={hide ? "password" : "text"}
            autoComplete="new-password"
            {...register("cPassword")}
          />
          {errors.cPassword ? (
            <p className="text-xs text-destructive">{errors.cPassword.message}</p>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
