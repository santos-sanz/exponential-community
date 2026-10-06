"use client";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { type CountryCode } from "libphonenumber-js/max";
import { type Ref } from "react";
import { Input } from "@/components/ui/input";
import { phoneCountries } from "@/lib/phone-countries";
import { internationalPhoneInput } from "@/lib/phone";

type Props = {
  value: string;
  country: CountryCode;
  disabled: boolean;
  invalid: boolean;
  inputRef: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onCountryChange: (country: CountryCode) => void;
};
export function PhoneNumberField({
  value,
  country,
  disabled,
  invalid,
  inputRef,
  onChange,
  onCountryChange,
}: Props) {
  const selected = phoneCountries.find((option) => option.code === country)!;
  return (
    <div className="phone-field" data-invalid={invalid || undefined}>
      <div className="phone-country">
        <Image
          src={`/flags/${country}.svg`}
          alt=""
          aria-hidden="true"
          width={24}
          height={16}
          className="country-flag"
        />
        <span aria-hidden="true">{selected.dialCode}</span>
        <ChevronDown size={12} aria-hidden="true" />
        <select
          aria-label="País del teléfono"
          value={country}
          disabled={disabled}
          className="country-select"
          onChange={(event) => {
            const option = phoneCountries.find(
              (option) => option.code === event.target.value,
            );
            if (option) onCountryChange(option.code);
          }}
        >
          {phoneCountries.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name} ({option.dialCode})
            </option>
          ))}
        </select>
      </div>
      <Input
        ref={inputRef}
        id="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country === "ES" ? "612 345 678" : "Número de teléfono"}
        value={value}
        onChange={(event) => {
          const international = internationalPhoneInput(event.target.value);
          if (international) {
            onCountryChange(international.country);
            onChange(international.national);
          } else onChange(event.target.value);
        }}
        required
        maxLength={40}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={invalid ? "phone-help phone-error" : "phone-help"}
        className="phone-input"
      />
    </div>
  );
}
