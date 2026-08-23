import { useId, useState, type FormEvent } from "react";
import { submissions } from "@wix/forms";
import { submitLead } from "../lib/leads";

export interface FormField {
  label: string;
  target: string;
  required: boolean;
  componentType: string;
  identifier?: string;
  options?: { value: string; label: string }[];
}

interface ContactFormProps {
  formId: string;
  fields: FormField[];
  locale?: "en" | "tr";
}

type FormStatus = "idle" | "submitting" | "success" | "error";
type FieldErrors = Record<string, string>;

function fieldId(prefix: string, target: string) {
  return `${prefix}-${target.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function fieldLabel(field: FormField) {
  return field.label || field.target.replace(/[_-]/g, " ");
}

function errorTarget(errorPath: string) {
  return errorPath.split(".").at(-1) ?? errorPath;
}

function targetStartsWith(field: FormField, prefix: string) {
  return field.target === prefix || field.target.startsWith(`${prefix}_`);
}

function findField(
  fields: FormField[],
  identifier: string,
  targetPrefix: string,
) {
  return fields.find(
    (field) =>
      (identifier !== "TEXT_INPUT" && field.identifier === identifier) ||
      targetStartsWith(field, targetPrefix),
  );
}

function inquiryMessage(
  fields: FormField[],
  data: Record<string, string>,
  locale: "en" | "tr",
) {
  const labels = locale === "tr"
    ? { company: "Şirket", email: "E-posta", project: "Proje Türü", message: "Mesaj", language: "Dil" }
    : { company: "Company", email: "Email", project: "Project Type", message: "Message", language: "Language" };
  const entries = [
    [labels.language, undefined, locale.toUpperCase()],
    [labels.company, findField(fields, "TEXT_INPUT", "company"), undefined],
    [labels.email, findField(fields, "CONTACTS_EMAIL", "email"), undefined],
    [labels.project, findField(fields, "TEXT_INPUT", "project_type"), undefined],
    [labels.message, findField(fields, "TEXT_INPUT", "message"), undefined],
  ] as const;

  return entries
    .map(([label, field, fixedValue]) => {
      const value = fixedValue ?? (field ? data[field.target]?.trim() : "");
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function wixFieldErrors(error: unknown, fallbackMessage: string, useProviderMessage: boolean): FieldErrors {
  const candidate = error as {
    details?: {
      validationError?: {
        fieldViolations?: Array<{
          data?: { errors?: Array<{ errorPath?: string; errorMessage?: string }> };
        }>;
      };
    };
  };
  const violations = candidate.details?.validationError?.fieldViolations ?? [];
  const errors: FieldErrors = {};

  for (const violation of violations) {
    for (const fieldError of violation.data?.errors ?? []) {
      if (!fieldError.errorPath) continue;
      const target = errorTarget(fieldError.errorPath);
      if (!errors[target]) {
        errors[target] = useProviderMessage
          ? fieldError.errorMessage ?? fallbackMessage
          : fallbackMessage;
      }
    }
  }

  return errors;
}

export default function ContactForm({ formId, fields, locale = "en" }: ContactFormProps) {
  const copy = locale === "tr"
    ? {
        required: (label: string) => `${label} alanı zorunludur.`,
        email: "Geçerli bir e-posta adresi girin.",
        configuration: "İletişim formu yapılandırması eksik.",
        success: "Teşekkürler. Talebiniz alınmıştır.",
        error: "Talebiniz gönderilemedi. İşaretlenen alanları kontrol edip yeniden deneyin.",
        wixPending: "Wix Forms gönderimi doğrulamadı.",
        routeDelayed: "Talebiniz Wix'e kaydedildi ancak çalışan yönlendirmesi gecikti. Yeni bir Wix kaydı oluşturmadan yönlendirmeyi yeniden denemek için tekrar gönderin.",
        fallback: "Talebiniz gönderilemedi.",
        invalid: "Geçersiz değer.",
        select: "Bir seçenek belirleyin",
        sending: "Talep gönderiliyor…",
        send: "Talebi gönder",
        privacyLead: "Formu kullanırken paylaştığınız kişisel verilerin nasıl işlendiğini",
        privacyLink: "KVKK Aydınlatma Metni",
        privacyTail: "içinde inceleyebilirsiniz.",
      }
    : {
        required: (label: string) => `${label} is required.`,
        email: "Enter a valid email address.",
        configuration: "The inquiry form configuration is incomplete.",
        success: "Thank you. Your inquiry has been received.",
        error: "We could not send your inquiry. Please review the highlighted fields and try again.",
        wixPending: "Wix Forms did not confirm the submission.",
        routeDelayed: "Your inquiry is saved in Wix, but employee routing is delayed. Send again to retry routing without creating another Wix submission.",
        fallback: "We could not send your inquiry.",
        invalid: "Invalid value.",
        select: "Select an option",
        sending: "Sending inquiry…",
        send: "Send inquiry",
        privacyLead: "Learn how personal data submitted through this form is handled in our",
        privacyLink: "Privacy / KVKK Notice",
        privacyTail: ".",
      };
  const formInstanceId = useId();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [wixSubmissionConfirmed, setWixSubmissionConfirmed] = useState(false);

  const validate = () => {
    const errors: FieldErrors = {};

    for (const field of fields) {
      const value = formData[field.target]?.trim() ?? "";
      if (field.required && !value) {
        errors[field.target] = copy.required(fieldLabel(field));
      } else if (
        value &&
        (field.identifier === "CONTACTS_EMAIL" || targetStartsWith(field, "email")) &&
        !/^\S+@\S+\.\S+$/.test(value)
      ) {
        errors[field.target] = copy.email;
      }
    }

    const nameField = findField(fields, "CONTACTS_FIRST_NAME", "name");
    const phoneField = findField(fields, "CONTACTS_PHONE", "phone");
    if (!nameField || !phoneField) {
      errors.__form = copy.configuration;
    }

    return errors;
  };

  const updateField = (target: string, value: string) => {
    setFormData((current) => ({ ...current, [target]: value }));
    setWixSubmissionConfirmed(false);
    setSubmitError("");
    setFieldErrors((current) => {
      if (!current[target]) return current;
      const { [target]: _cleared, ...remaining } = current;
      return remaining;
    });
    if (status === "error") setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setSubmitError(clientErrors.__form ?? "");
      setStatus(clientErrors.__form ? "error" : "idle");
      return;
    }

    setStatus("submitting");
    setFieldErrors({});
    setSubmitError("");

    let wixRecorded = wixSubmissionConfirmed;
    try {
      if (!wixRecorded) {
        const result = await submissions.createSubmission({
          formId,
          submissions: Object.fromEntries(
            Object.entries(formData).map(([target, value]) => [target, value.trim()]),
          ),
        });

        if (result.status !== "PENDING" && result.status !== "CONFIRMED") {
          throw new Error(copy.wixPending);
        }
        wixRecorded = true;
        setWixSubmissionConfirmed(true);
      }

      const nameField = findField(fields, "CONTACTS_FIRST_NAME", "name");
      const phoneField = findField(fields, "CONTACTS_PHONE", "phone");
      if (!nameField || !phoneField) {
        throw new Error(copy.configuration);
      }

      await submitLead({
        isim: formData[nameField.target]?.trim() ?? "",
        telefon: formData[phoneField.target]?.trim() ?? "",
        mesaj: inquiryMessage(fields, formData, locale),
        kaynak: "contact",
        dil: locale,
      });

      setStatus("success");
      setFormData({});
      setWixSubmissionConfirmed(false);
    } catch (error: unknown) {
      const submissionErrors = wixFieldErrors(error, copy.invalid, locale === "en");
      if (Object.keys(submissionErrors).length > 0) {
        setFieldErrors(submissionErrors);
      }
      setSubmitError(
        wixRecorded
          ? copy.routeDelayed
          : error instanceof Error
            ? error.message
            : copy.fallback,
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="form-success" role="status" aria-live="polite" tabIndex={-1}>
        {copy.success}
      </div>
    );
  }

  const privacyHref = locale === "tr" ? "/tr/privacy" : "/privacy";

  return (
    <form className="form-container" noValidate onSubmit={handleSubmit} aria-busy={status === "submitting"}>
      {status === "error" && (
        <p className="form-error" role="alert">
          {submitError || copy.error}
        </p>
      )}

      {fields.map((field) => {
        const id = fieldId(formInstanceId, field.target);
        const error = fieldErrors[field.target];
        const errorId = `${id}-error`;
        const inputClass = error ? " form-input-error" : "";
        const isTextarea = field.identifier === "TEXT_AREA" || targetStartsWith(field, "message");
        const isSelect = field.componentType === "DROPDOWN" && field.options;
        const isEmail = field.identifier === "CONTACTS_EMAIL" || targetStartsWith(field, "email");
        const isPhone = field.identifier === "CONTACTS_PHONE" || targetStartsWith(field, "phone");
        const commonProps = {
          id,
          name: field.target,
          required: field.required,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? errorId : undefined,
          disabled: status === "submitting",
          value: formData[field.target] ?? "",
          onChange: (inputEvent: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            updateField(field.target, inputEvent.target.value),
        };

        return (
          <div className="form-field" key={field.target}>
            <label className="form-label" htmlFor={id}>
              {fieldLabel(field)}
              {field.required && <span className="required" aria-hidden="true">*</span>}
            </label>

            {isSelect ? (
              <select {...commonProps} className={`form-select${inputClass}`}>
                <option value="">{copy.select}</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : isTextarea ? (
              <textarea {...commonProps} className={`form-textarea${inputClass}`} rows={5} />
            ) : (
              <input
                {...commonProps}
                className={`form-input${inputClass}`}
                type={isEmail ? "email" : isPhone ? "tel" : "text"}
                autoComplete={isEmail ? "email" : isPhone ? "tel" : undefined}
              />
            )}

            {error && <p id={errorId} className="form-field-error">{error}</p>}
          </div>
        );
      })}

      <p className="form-legal-note">
        {copy.privacyLead}{" "}
        <a href={privacyHref} data-kvkk-open>{copy.privacyLink}</a>{" "}
        {copy.privacyTail}
      </p>

      <button className="form-button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? copy.sending : copy.send}
      </button>
    </form>
  );
}
