import assert from "node:assert/strict";
import {
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  countryCodeForName,
  isSupportedCountry,
  normalizeSupportedCountry,
  withRegistrationCountry,
} from "../src/lib/community/countries";

assert.equal(DEFAULT_COUNTRY, "France");
assert.equal(SUPPORTED_COUNTRIES[0].value, "France");
assert.equal(isSupportedCountry("France"), true);
assert.equal(isSupportedCountry("Belgium"), true);
assert.equal(isSupportedCountry("Other"), false);
assert.equal(isSupportedCountry("Autre"), false);
assert.equal(isSupportedCountry(""), false);
assert.equal(isSupportedCountry(undefined), false);
assert.equal(normalizeSupportedCountry("Other"), "France");
assert.equal(countryCodeForName("Israel"), "IL");
assert.equal(countryCodeForName("Switzerland"), "CH");
assert.equal(
  withRegistrationCountry("/onboarding?callbackUrl=%2Fdashboard%2Fnewsletter", "Belgium"),
  "/onboarding?callbackUrl=%2Fdashboard%2Fnewsletter&country=Belgium",
);
assert.equal(
  withRegistrationCountry("/onboarding", "Other"),
  "/onboarding?country=France",
);
assert.equal(
  SUPPORTED_COUNTRIES.some((country) => /other|autre/i.test(country.value) || /other|autre/i.test(country.label)),
  false,
);

console.log("Country validation: required closed list, France default, and Other/Autre rejected.");
