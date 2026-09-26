# Utils Preference

Prefer shared helpers from `@ameralds/utils` over local controller/service helpers.

For query params and scalar normalization, use:

- `toArray`
- `toNumberArray`
- `toString`

Do not reimplement these conversions in feature modules unless behavior must intentionally differ.
