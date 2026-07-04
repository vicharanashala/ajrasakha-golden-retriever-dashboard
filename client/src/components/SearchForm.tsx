import { type FormEvent, useState } from 'react';
import { MapPin, Search, Sprout } from 'lucide-react';
import type { SearchPayload } from '../types';

const states = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const unionTerritories = [
  { label: 'Andaman and Nicobar Islands', value: 'Andaman and Nicobar Islands' },
  { label: 'Chandigarh', value: 'Chandigarh' },
  {
    label: 'Dadra and Nagar Haveli and Daman and Diu',
    value: 'Dadra and Nagar Haveli and Daman and Diu',
  },
  { label: 'Delhi (National Capital Territory)', value: 'Delhi' },
  { label: 'Jammu and Kashmir', value: 'Jammu and Kashmir' },
  { label: 'Ladakh', value: 'Ladakh' },
  { label: 'Lakshadweep', value: 'Lakshadweep' },
  { label: 'Puducherry', value: 'Puducherry' },
];

interface SearchFormProps {
  loading: boolean;
  fieldErrors: Record<string, string[]>;
  onSearch: (payload: SearchPayload) => void;
}

export function SearchForm({
  loading,
  fieldErrors,
  onSearch,
}: SearchFormProps) {
  const [question, setQuestion] = useState('');
  const [crop, setCrop] = useState('');
  const [state, setState] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (question.trim().length < 3) errors.question = 'Enter a valid question.';
    if (!state) errors.state = 'Select a state or Union Territory.';
    if (crop.trim().length < 2) errors.crop = 'Enter a crop name.';

    if (Object.keys(errors).length) {
      setLocalErrors(errors);
      return;
    }

    setLocalErrors({});
    onSearch({
      rephrased_query: question.trim(),
      crop: crop.trim(),
      state,
    });
  };

  return (
    <section className="search-panel" aria-labelledby="search-heading">
      <h1 id="search-heading">Search agricultural questions</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label className="form-field form-field--question">
          <span>Question</span>
          <textarea
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setLocalErrors((current) => ({ ...current, question: '' }));
            }}
            placeholder="Type your question here"
            rows={3}
            maxLength={1_000}
            aria-invalid={Boolean(localErrors.question || fieldErrors.rephrased_query)}
          />
          {(localErrors.question || fieldErrors.rephrased_query?.[0]) && (
            <small>{localErrors.question || fieldErrors.rephrased_query?.[0]}</small>
          )}
        </label>

        <div className="search-fields">
          <label className="form-field">
            <span>
              <MapPin size={15} /> State / Union Territory
            </span>
            <select
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setLocalErrors((current) => ({ ...current, state: '' }));
              }}
              aria-invalid={Boolean(localErrors.state || fieldErrors.state)}
            >
              <option value="">Select state or Union Territory</option>
              <optgroup label="States">
                {states.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Union Territories">
                {unionTerritories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {(localErrors.state || fieldErrors.state?.[0]) && (
              <small>{localErrors.state || fieldErrors.state?.[0]}</small>
            )}
          </label>

          <label className="form-field">
            <span>
              <Sprout size={15} /> Crop
            </span>
            <input
              value={crop}
              onChange={(event) => {
                setCrop(event.target.value);
                setLocalErrors((current) => ({ ...current, crop: '' }));
              }}
              placeholder="Type crop name here"
              maxLength={100}
              aria-invalid={Boolean(localErrors.crop || fieldErrors.crop)}
            />
            {(localErrors.crop || fieldErrors.crop?.[0]) && (
              <small>{localErrors.crop || fieldErrors.crop?.[0]}</small>
            )}
          </label>

          <button className="search-button" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <Search size={18} />}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
    </section>
  );
}
