# Adding A New Language

1. Create a new file in this folder, for example `es.ts`.
2. Copy the structure from `en.ts` and translate values.
3. Add the new locale to `src/locales/index.ts`:
   - import it
   - add it to `locales`
   - add it to `localeList`
4. Use a unique `code` and set `dir` to `ltr` or `rtl`.

The app reads language data directly from this folder, so new languages become available from the language switcher.