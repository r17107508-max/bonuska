"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";
import { registerCompany, type CompanyRegistrationState } from "@/app/actions";

const initialState: CompanyRegistrationState = { error: null };

const businessTypes = ["Кофейня", "Шаурмичная", "Пекарня", "Напитки", "Фастфуд", "Пиццерия", "Кондитерская", "Барбершоп", "Другое"];

type FormValues = {
  name: string;
  businessType: string;
  city: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  offerAccepted: boolean;
  privacyAccepted: boolean;
};

const initialValues: FormValues = {
  name: "",
  businessType: businessTypes[0],
  city: "",
  address: "",
  ownerName: "",
  phone: "",
  email: "",
  password: "",
  offerAccepted: false,
  privacyAccepted: false,
};

export function CompanyRegisterForm() {
  const [state, formAction, pending] = useActionState(registerCompany, initialState);
  const [values, setValues] = useState(initialValues);
  const [clientError, setClientError] = useState<ValidationError | null>(null);

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.currentTarget;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateCheckbox(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.currentTarget;
    setValues((current) => ({ ...current, [name]: checked }));
  }

  function validateBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const error = validateRegistration(values);
    setClientError(error);

    if (!error) return;

    event.preventDefault();
    requestAnimationFrame(() => {
      form.querySelector<HTMLElement>(`[name="${error.field}"]`)?.focus();
    });
  }

  const errorMessage = clientError?.message ?? state.error;

  return (
    <form action={formAction} noValidate onSubmit={validateBeforeSubmit} onReset={(event) => event.preventDefault()} className="mt-6 grid gap-4 sm:grid-cols-2">
      {errorMessage && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">
          {errorMessage}. Проверьте данные — заполненные поля сохранены.
        </p>
      )}

      <RegistrationField label="Название компании" name="name" value={values.name} onChange={updateField} autoComplete="organization" />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Тип бизнеса</span>
        <select
          name="businessType"
          value={values.businessType}
          onChange={updateField}
          className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
        >
          {businessTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>

      <RegistrationField label="Город" name="city" value={values.city} onChange={updateField} autoComplete="address-level2" />
      <RegistrationField label="Адрес" name="address" value={values.address} onChange={updateField} autoComplete="street-address" required={false} />
      <RegistrationField label="ФИО владельца/управляющего" name="ownerName" value={values.ownerName} onChange={updateField} autoComplete="name" />
      <RegistrationField label="Телефон" name="phone" value={values.phone} onChange={updateField} autoComplete="tel" inputMode="tel" placeholder="+7 900 000-00-00" />
      <RegistrationField label="Email для уведомлений" name="email" value={values.email} onChange={updateField} type="email" autoComplete="email" inputMode="email" />

      <div className="sm:col-span-2">
        <RegistrationField
          label="Пароль для кабинета"
          name="password"
          value={values.password}
          onChange={updateField}
          type="password"
          autoComplete="new-password"
          minLength={10}
        />
        <p className="mt-1.5 text-xs text-slate-500">Не менее 10 символов. Сохраните пароль в надёжном менеджере паролей.</p>
      </div>

      <input type="hidden" name="inn" value="" />
      <input type="hidden" name="slug" value="" />
      <input type="hidden" name="comment" value="" />

      <div className="space-y-3 rounded-lg bg-slate-50 p-4 sm:col-span-2">
        <label className="flex gap-3 text-sm font-medium text-slate-700">
          <input name="offerAccepted" type="checkbox" checked={values.offerAccepted} onChange={updateCheckbox} className="mt-1 size-4" required />
          <span>Я принимаю условия договора-оферты. <Link className="font-semibold text-[var(--brand)]" href="/offer" target="_blank">Открыть оферту</Link></span>
        </label>
        <label className="flex gap-3 text-sm font-medium text-slate-700">
          <input name="privacyAccepted" type="checkbox" checked={values.privacyAccepted} onChange={updateCheckbox} className="mt-1 size-4" required />
          <span>Я согласен на обработку персональных данных. <Link className="font-semibold text-[var(--brand)]" href="/privacy" target="_blank">Политика</Link></span>
        </label>
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? "Создаём компанию..." : "Зарегистрироваться и войти"}
        </button>
      </div>
    </form>
  );
}

type ValidationError = {
  field: keyof FormValues;
  message: string;
};

function validateRegistration(values: FormValues): ValidationError | null {
  if (!values.name.trim()) return { field: "name", message: "Укажите название компании" };
  if (!values.city.trim()) return { field: "city", message: "Укажите город" };
  if (!values.ownerName.trim()) return { field: "ownerName", message: "Укажите ФИО владельца или управляющего" };
  if (values.phone.replace(/\D/g, "").length < 10) return { field: "phone", message: "Укажите корректный номер телефона — не менее 10 цифр" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return { field: "email", message: "Укажите корректный email" };
  if (values.password.length < 10) {
    return {
      field: "password",
      message: `Пароль слишком короткий: введено ${values.password.length} из 10 символов. Введите не менее 10 символов`,
    };
  }
  if (!values.offerAccepted) return { field: "offerAccepted", message: "Примите условия договора-оферты" };
  if (!values.privacyAccepted) return { field: "privacyAccepted", message: "Подтвердите согласие на обработку персональных данных" };
  return null;
}

function RegistrationField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  minLength,
  required = true,
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "email" | "tel";
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
      />
    </label>
  );
}
