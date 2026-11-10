// Delivery address form. Field rules mirror shippingAddressSchema in
// src/validators/order.validator.ts.
import { field } from "../../ui/components.js";
import { h } from "../../utils/dom.js";

export function addressForm(id, saved) {
  return h(
    "form",
    { class: "form", novalidate: true, id },
    field({ name: "line1", label: "Street address", value: saved.line1, required: true, autocomplete: "address-line1", maxlength: 200 }),
    field({ name: "line2", label: "Apartment, building", hint: "optional", value: saved.line2, autocomplete: "address-line2", maxlength: 200 }),
    h(
      "div",
      { class: "form-row" },
      field({ name: "city", label: "City / town", value: saved.city, required: true, autocomplete: "address-level2", maxlength: 120 }),
      field({ name: "region", label: "County", hint: "optional", value: saved.region, autocomplete: "address-level1", maxlength: 120 }),
    ),
    h(
      "div",
      { class: "form-row" },
      field({ name: "postalCode", label: "Postal code", value: saved.postalCode, required: true, autocomplete: "postal-code", maxlength: 30, inputmode: "numeric" }),
      field({ name: "country", label: "Country code", value: saved.country, required: true, autocomplete: "country", maxlength: 2 }),
    ),
  );
}

// Marks invalid inputs and returns the first one (or null when valid).
export function validateAddressForm(form) {
  let firstInvalid = null;
  for (const input of form.querySelectorAll("input")) {
    const value = input.value.trim();
    const invalid = (input.required && !value) || (input.name === "country" && !/^[A-Za-z]{2}$/.test(value));
    input.setAttribute("aria-invalid", String(invalid));
    if (invalid && !firstInvalid) firstInvalid = input;
  }
  return firstInvalid;
}

export function readAddress(form) {
  const data = Object.fromEntries(new FormData(form));
  return {
    line1: data.line1.trim(),
    line2: data.line2.trim() || undefined,
    city: data.city.trim(),
    region: data.region.trim() || undefined,
    postalCode: data.postalCode.trim(),
    country: data.country.trim().toUpperCase(),
  };
}
