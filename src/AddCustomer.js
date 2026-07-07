import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import {
  FormSection, FormCard, FormGrid, FormField, FormActions,
  inputStyle, readonlyInputStyle, selectStyle, textareaStyle,
} from "./components/ui/FormComponents";
import { API_URL } from "./config";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";

/** ISO 3166-1 alpha-2 → ITU calling code */
const ISO_TO_CALLING_CODE = {
  AF:'+93',AL:'+355',DZ:'+213',AS:'+1',AD:'+376',AO:'+244',AG:'+1',
  AR:'+54',AM:'+374',AW:'+297',AU:'+61',AT:'+43',AZ:'+994',BS:'+1',
  BH:'+973',BD:'+880',BB:'+1',BY:'+375',BE:'+32',BZ:'+501',BJ:'+229',
  BT:'+975',BO:'+591',BA:'+387',BW:'+267',BR:'+55',BN:'+673',BG:'+359',
  BF:'+226',BI:'+257',KH:'+855',CM:'+237',CA:'+1',CV:'+238',CF:'+236',
  TD:'+235',CL:'+56',CN:'+86',CO:'+57',KM:'+269',CG:'+242',CD:'+243',
  CR:'+506',HR:'+385',CU:'+53',CY:'+357',CZ:'+420',DK:'+45',DJ:'+253',
  DM:'+1',DO:'+1',TL:'+670',EC:'+593',EG:'+20',SV:'+503',GQ:'+240',
  ER:'+291',EE:'+372',ET:'+251',FJ:'+679',FI:'+358',FR:'+33',GA:'+241',
  GM:'+220',GE:'+995',DE:'+49',GH:'+233',GR:'+30',GD:'+1',GT:'+502',
  GN:'+224',GW:'+245',GY:'+592',HT:'+509',HN:'+504',HK:'+852',HU:'+36',
  IS:'+354',IN:'+91',ID:'+62',IR:'+98',IQ:'+964',IE:'+353',IL:'+972',
  IT:'+39',JM:'+1',JP:'+81',JO:'+962',KZ:'+7',KE:'+254',KI:'+686',
  KW:'+965',KG:'+996',LA:'+856',LV:'+371',LB:'+961',LS:'+266',LR:'+231',
  LY:'+218',LI:'+423',LT:'+370',LU:'+352',MO:'+853',MK:'+389',MG:'+261',
  MW:'+265',MY:'+60',MV:'+960',ML:'+223',MT:'+356',MH:'+692',MR:'+222',
  MU:'+230',MX:'+52',FM:'+691',MD:'+373',MC:'+377',MN:'+976',ME:'+382',
  MA:'+212',MZ:'+258',MM:'+95',NA:'+264',NR:'+674',NP:'+977',NL:'+31',
  NC:'+687',NZ:'+64',NI:'+505',NE:'+227',NG:'+234',NU:'+683',KP:'+850',
  NO:'+47',OM:'+968',PK:'+92',PW:'+680',PS:'+970',PA:'+507',PG:'+675',
  PY:'+595',PE:'+51',PH:'+63',PL:'+48',PT:'+351',PR:'+1',QA:'+974',
  RO:'+40',RU:'+7',RW:'+250',KN:'+1',LC:'+1',VC:'+1',WS:'+685',
  SM:'+378',ST:'+239',SA:'+966',SN:'+221',RS:'+381',SC:'+248',SL:'+232',
  SG:'+65',SK:'+421',SI:'+386',SB:'+677',SO:'+252',ZA:'+27',KR:'+82',
  SS:'+211',ES:'+34',LK:'+94',SD:'+249',SR:'+597',SE:'+46',CH:'+41',
  SY:'+963',TW:'+886',TJ:'+992',TZ:'+255',TH:'+66',TG:'+228',TO:'+676',
  TT:'+1',TN:'+216',TR:'+90',TM:'+993',TV:'+688',UG:'+256',UA:'+380',
  AE:'+971',GB:'+44',US:'+1',UY:'+598',UZ:'+998',VU:'+678',VE:'+58',
  VN:'+84',YE:'+967',ZM:'+260',ZW:'+263',
};

const CUSTOMER_TYPES = [
  'Retail Shops', 'Chain Stores', 'Hospitals & Clinics',
  'Wholesaler', 'Cr Lab', 'Grinders', 'Brands',
];

export default function AddCustomer() {
  console.log("ADDCUSTOMER BUILD VERIFIED", new Date().toISOString());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');

  const [form, setForm] = useState({
    companyName:   '',
    contactName:   '',
    countryCode1:  '+91',
    mobile1:       '',
    countryCode2:  '+91',
    mobile2:       '',
    email:         '',
    address:       '',
    pincode:       '',
    gstNumber:     '',
    customerType:  '',
    tag:           '',
    stopPaymentReminder: false,
  });

  const [city,    setCity]    = useState('');
  const [state,   setState]   = useState('');
  const [country, setCountry] = useState('India');

  const [cityResults,  setCityResults]  = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const selectedCityRef = useRef({ name: '', state: '', country: '' });
  const geocoderRef = useRef(null);
  const geoLookupCacheRef = useRef(new Map());
  const autoFilledAddressRef = useRef({ state: '', country: '' });

  const toSentenceCase = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (['companyName', 'contactName', 'tag'].includes(name)) {
      value = toSentenceCase(value);
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMobileChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.startsWith('0')) value = value.substring(1);
    if (value.length > 10) value = value.slice(0, 10);
    setForm(prev => ({ ...prev, [e.target.name]: value }));
  };

  const syncCityToDB = async (cityData) => {
    try {
      await fetch(`${API_URL}/cities/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityData),
      });
    } catch {}
  };

  const logGeoLookupDebug = (...args) => {
    console.log('[Address lookup]', ...args);
  };

  const getGoogleGeocoder = () => {
    if (!window.google?.maps?.Geocoder) return null;
    if (!geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder();
    return geocoderRef.current;
  };

  const geocodeAddress = (request) => new Promise((resolve) => {
    const geocoder = getGoogleGeocoder();
    if (!geocoder) {
      logGeoLookupDebug('Google Geocoder unavailable');
      resolve(null);
      return;
    }
    logGeoLookupDebug('Geocoder request', request);
    console.log('[DEBUG] REQUEST SENT', request);
    geocoder.geocode(request, (results, status) => {
      console.log('[DEBUG] GEOCODER CALLBACK status:', status, 'results:', results);
      if (status === window.google.maps.GeocoderStatus.OK && results?.length) {
        console.log('[DEBUG] STATUS OK results[0].formatted_address:', results[0]?.formatted_address, 'address_components:', results[0]?.address_components);
        logGeoLookupDebug('Google Geocoder response', {
          status,
          resultCount: results.length,
          results,
        });
        results.forEach((result, index) => {
          logGeoLookupDebug(`Result ${index} address_components`, result.address_components || []);
          (result.address_components || []).forEach((component) => {
            logGeoLookupDebug('Component', {
              types: component.types,
              long_name: component.long_name,
              short_name: component.short_name,
            });
          });
        });
        const selectedResult =
          results.find((result) =>
            result.address_components?.some((component) =>
              component.types?.includes('administrative_area_level_1'),
            ),
          ) || results[0];
        logGeoLookupDebug('Selected Geocoder result', {
          formatted_address: selectedResult.formatted_address,
          has_administrative_area_level_1: !!selectedResult.address_components?.some((component) =>
            component.types?.includes('administrative_area_level_1'),
          ),
        });
        resolve(selectedResult);
      } else {
        console.log('[DEBUG] EARLY RETURN: geocode failed status:', status, 'request:', request);
        logGeoLookupDebug('geocode failed', status, request);
        resolve(null);
      }
    });
  });

  const addressComponent = (components, type, field = 'long_name') =>
    components?.find((c) => c.types?.includes(type))?.[field] || '';

  const normalizeGeocodeResult = (result) => {
    const components = result?.address_components || [];
    const resolved = {
      city:
        addressComponent(components, 'locality') ||
        addressComponent(components, 'postal_town') ||
        addressComponent(components, 'administrative_area_level_3') ||
        addressComponent(components, 'administrative_area_level_2') ||
        addressComponent(components, 'sublocality') ||
        '',
      state: addressComponent(components, 'administrative_area_level_1'),
      country: addressComponent(components, 'country'),
      countryISO: addressComponent(components, 'country', 'short_name'),
      postalCode: addressComponent(components, 'postal_code'),
    };
    logGeoLookupDebug('Resolved address fields', resolved);
    logGeoLookupDebug('Resolved State:', resolved.state || '(blank)');
    return resolved;
  };

  const normalizeText = (value) =>
    String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  const cityMatches = (typedCity, googleCity) => {
    const typed = normalizeText(typedCity);
    const found = normalizeText(googleCity);
    return !!typed && !!found && (typed === found || found.includes(typed) || typed.includes(found));
  };

  const updateAutoAddressFields = (resolved, options = {}) => {
    if (!resolved) return false;

    const currentCity = city.trim();
    if (options.requireCityMatch && currentCity && (!resolved.city || !cityMatches(currentCity, resolved.city))) {
      logGeoLookupDebug('city/pincode mismatch', { city: currentCity, resolvedCity: resolved.city || '' });
      console.log('[DEBUG] EARLY RETURN: city/pincode mismatch', { currentCity, resolvedCity: resolved.city || '' });
      return false;
    }

    const nextCity = resolved.city || currentCity;
    if (options.updateCity && resolved.city) {
      setCity((prev) => {
        if (!prev.trim() || cityMatches(prev, resolved.city)) return resolved.city;
        return prev;
      });
    }

    if (resolved.state) {
      console.log('[DEBUG] SETTING STATE', resolved.state);
      setState((prev) => {
        logGeoLookupDebug('State update attempt', {
          previous_state: prev,
          previous_auto_state: autoFilledAddressRef.current.state,
          resolved_state: resolved.state,
        });
        if (prev && autoFilledAddressRef.current.state && prev !== autoFilledAddressRef.current.state) {
          logGeoLookupDebug('State update skipped: existing state appears manually edited', {
            kept_state: prev,
            resolved_state: resolved.state,
          });
          console.log('[DEBUG] EARLY RETURN: setState skipped — manually edited', { kept: prev, resolved: resolved.state });
          return prev;
        }
        autoFilledAddressRef.current.state = resolved.state;
        logGeoLookupDebug('React setState(state) writing', resolved.state);
        return resolved.state;
      });
    }

    if (resolved.country) {
      console.log('[DEBUG] SETTING COUNTRY', resolved.country);
      setCountry((prev) => {
        if (prev && autoFilledAddressRef.current.country && prev !== autoFilledAddressRef.current.country) {
          console.log('[DEBUG] EARLY RETURN: setCountry skipped — manually edited', { kept: prev, resolved: resolved.country });
          return prev;
        }
        autoFilledAddressRef.current.country = resolved.country;
        return resolved.country;
      });
    }

    if (resolved.countryISO) {
      const callingCode = ISO_TO_CALLING_CODE[resolved.countryISO] || '+91';
      setForm(prev => ({ ...prev, countryCode1: callingCode, countryCode2: callingCode }));
    }

    selectedCityRef.current = {
      name: nextCity || selectedCityRef.current.name || '',
      state: resolved.state || state || selectedCityRef.current.state || '',
      country: resolved.country || country || selectedCityRef.current.country || 'India',
    };
    return true;
  };

  useEffect(() => {
    logGeoLookupDebug('Rendered State input value', state || '(blank)');
  }, [state]);

  const handleCitySelect = (place) => {
    if (place.address_components) {
      let cityName = '', stateName = '', countryName = '', countryISO = '';
      place.address_components.forEach((c) => {
        const t = c.types;
        if (t.includes('locality'))                     cityName    = c.long_name;
        if (t.includes('administrative_area_level_1'))  stateName   = c.long_name;
        if (t.includes('country')) { countryName = c.long_name; countryISO = c.short_name; }
      });
      const callingCode = ISO_TO_CALLING_CODE[countryISO] || '+91';
      setCity(cityName);
      setState(stateName);
      setCountry(countryName);
      autoFilledAddressRef.current = { state: stateName, country: countryName };
      setForm(prev => ({ ...prev, countryCode1: callingCode, countryCode2: callingCode }));
      selectedCityRef.current = { name: cityName, state: stateName, country: countryName };
      syncCityToDB({ name: cityName, state: stateName, country: countryName, countryISO, countryCode: callingCode });
    } else {
      const callingCode = place.countryCode || ISO_TO_CALLING_CODE[place.countryISO] || '+91';
      setCity(place.name);
      setState(place.state || '');
      setCountry(place.country || 'India');
      autoFilledAddressRef.current = { state: place.state || '', country: place.country || 'India' };
      setForm(prev => ({ ...prev, countryCode1: callingCode, countryCode2: callingCode }));
      selectedCityRef.current = { name: place.name, state: place.state || '', country: place.country || 'India' };
    }
  };

  const handleCitySearch = async (value) => {
    console.log("HANDLE CITY SEARCH EXECUTED");
    console.log('[DEBUG] CITY SEARCH START', value);
    setCity(value);
    if (!value) {
      setCityResults([]);
      setShowDropdown(false);
      selectedCityRef.current = { name: '', state: '', country: '' };
      return;
    }
    try {
      const res  = await fetch(`${API_URL}/cities/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data.length > 0) {
        setCityResults(data.map(c => ({
          id: c.id, name: c.name, state: c.state, country: c.country,
          countryISO: c.countryISO, countryCode: c.countryCode,
          label: `${c.name}, ${c.state}, ${c.country}`, source: 'saved',
        })));
        setShowDropdown(true);
        return;
      }
    } catch {}
    if (window.google) {
      new window.google.maps.places.AutocompleteService().getPlacePredictions(
        { input: value, types: ['(cities)'] },
        (predictions) => {
          if (predictions) {
            setCityResults(predictions.map(p => ({
              place_id: p.place_id, description: p.description,
              label: p.description, source: 'google',
            })));
            setShowDropdown(true);
          }
        }
      );
    }
  };

  useEffect(() => {
    const value = city.trim();
    if (value.length < 3) return undefined;
    if (
      selectedCityRef.current.name &&
      normalizeText(selectedCityRef.current.name) === normalizeText(value) &&
      selectedCityRef.current.state &&
      selectedCityRef.current.country
    ) {
      return undefined;
    }

    const cacheKey = `city:${normalizeText(value)}`;
    const cached = geoLookupCacheRef.current.get(cacheKey);
    if (cached) {
      updateAutoAddressFields(cached);
      return undefined;
    }

    const timer = setTimeout(async () => {
      console.log('[DEBUG] CALLING GEOCODER', { address: value });
      const result = await geocodeAddress({ address: value });
      console.log('[DEBUG] RAW RESULT', result);
      const resolved = normalizeGeocodeResult(result);
      console.log('[DEBUG] NORMALIZED city:', resolved.city, 'state:', resolved.state, 'country:', resolved.country);
      if (!resolved.state && !resolved.country) {
        console.log('[DEBUG] EARLY RETURN: no state and no country in normalized result');
        return;
      }
      geoLookupCacheRef.current.set(cacheKey, resolved);
      updateAutoAddressFields(resolved);
    }, 600);

    return () => clearTimeout(timer);
    // Only city changes should trigger the manual city lookup debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    const pin = String(form.pincode || '').replace(/\D/g, '').slice(0, 6);
    if (pin.length < 6) return undefined;

    const cacheKey = `pincode:${pin}`;
    const cached = geoLookupCacheRef.current.get(cacheKey);
    if (cached) {
      updateAutoAddressFields(cached, { updateCity: true, requireCityMatch: !!city.trim() });
      return undefined;
    }

    const timer = setTimeout(async () => {
      const address = [pin, country || 'India'].filter(Boolean).join(', ');
      const result = await geocodeAddress({ address });
      const resolved = normalizeGeocodeResult(result);
      if (!resolved.city && !resolved.state && !resolved.country) {
        console.log('[DEBUG] EARLY RETURN: pincode geocoder resolved nothing');
        return;
      }
      geoLookupCacheRef.current.set(cacheKey, resolved);
      updateAutoAddressFields(resolved, { updateCity: true, requireCityMatch: !!city.trim() });
    }, 600);

    return () => clearTimeout(timer);
    // Only pincode/city changes should trigger the manual pincode validation debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode, city]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName || !form.mobile1 || !form.tag) {
      toast.error('Company name, tag and mobile are required');
      return;
    }
    if (form.mobile1.length !== 10) {
      toast.error('Mobile must be 10 digits');
      return;
    }
    const selectedCity = selectedCityRef.current?.name
      ? selectedCityRef.current
      : { name: city, state: state || '', country: country || 'India' };
    if (!selectedCity.name) {
      toast.error('Please select a city from the dropdown');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          city,
          state,
          country,
          mobile1: form.countryCode1 + form.mobile1,
          mobile2: form.mobile2 ? form.countryCode2 + form.mobile2 : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Error saving customer'); return; }
      toast.success('Customer added successfully');
      if (leadId) {
        navigate(`/quotation?customerId=${data.id}&leadId=${leadId}`);
      } else {
        navigate('/customers');
      }
    } catch {
      toast.error('Error saving customer');
    } finally {
      setLoading(false);
    }
  };

  const codeStyle = {
    ...inputStyle,
    width: 72,
    flexShrink: 0,
    background: '#f9fafb',
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: 600,
  };

  return (
    <PageLayout title="Add customer">
      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>

        {/* ── Basic info ─────────────────────────────────────── */}
        <FormSection title="Basic info">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>
              <FormField label="Company name" required colSpan={2}>
                <input name="companyName" value={form.companyName} onChange={handleChange}
                  placeholder="e.g. Lens World Pvt Ltd" style={inputStyle} />
              </FormField>
              <FormField label="Contact person">
                <input name="contactName" value={form.contactName} onChange={handleChange}
                  placeholder="Primary contact name" style={inputStyle} />
              </FormField>
              <FormField label="Tag" required help="Short internal identifier">
                <input name="tag" value={form.tag} onChange={handleChange}
                  placeholder="e.g. Hospital, Retail" style={inputStyle} />
              </FormField>
              <FormField label="Customer type" colSpan={2}>
                <select name="customerType" value={form.customerType} onChange={handleChange} style={selectStyle}>
                  <option value="">Select type</option>
                  {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Contact ────────────────────────────────────────── */}
        <FormSection title="Contact">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>
              <FormField label="Mobile" required>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={form.countryCode1} readOnly title="Set from city" style={codeStyle} />
                  <input name="mobile1" value={form.mobile1} onChange={handleMobileChange}
                    placeholder="10-digit number" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </FormField>
              <FormField label="Mobile 2">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={form.countryCode2} readOnly title="Set from city" style={codeStyle} />
                  <input name="mobile2" value={form.mobile2} onChange={handleMobileChange}
                    placeholder="Optional" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </FormField>
              <FormField label="Email" colSpan={2}>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="contact@example.com" style={inputStyle} />
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Location ───────────────────────────────────────── */}
        <FormSection title="Location">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>

              {/* City — with autocomplete */}
              <FormField label="City" help="Type to search; select from dropdown">
                <div style={{ position: 'relative' }}>
                  <input
                    value={city}
                    onChange={(e) => handleCitySearch(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search city…"
                    style={inputStyle}
                  />
                  {showDropdown && cityResults.length > 0 && (
                    <div style={{
                      position: 'absolute', zIndex: 9999, top: 'calc(100% + 4px)',
                      left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                      maxHeight: 200, overflowY: 'auto',
                    }}>
                      {cityResults.map((c) => (
                        <div
                          key={c.id || c.place_id}
                          onMouseDown={async () => {
                            if (c.source === 'google' && window.google) {
                              new window.google.maps.places.PlacesService(
                                document.createElement('div')
                              ).getDetails({ placeId: c.place_id }, (place, status) => {
                                if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
                                  handleCitySelect(place);
                                  setShowDropdown(false);
                                } else {
                                  toast.error('Failed to load city details');
                                }
                              });
                            } else {
                              handleCitySelect(c);
                              setShowDropdown(false);
                            }
                          }}
                          style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                          <span>{c.label || c.description}</span>
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 4, marginLeft: 8,
                            background: c.source === 'saved' ? '#dcfce7' : '#dbeafe',
                            color: c.source === 'saved' ? '#15803d' : '#1d4ed8',
                          }}>
                            {c.source === 'saved' ? 'Saved' : 'Google'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>

              <FormField label="Pincode">
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setForm(prev => ({ ...prev, pincode: val }));
                  }}
                  placeholder="6-digit code"
                  style={inputStyle}
                />
              </FormField>

              <FormField label="State" help="Auto-filled from city">
                <input value={state} readOnly style={readonlyInputStyle} />
              </FormField>
              <FormField label="Country" help="Auto-filled from city">
                <input value={country} readOnly style={readonlyInputStyle} />
              </FormField>

              <FormField label="Address" colSpan={2}>
                <textarea name="address" value={form.address} onChange={handleChange}
                  placeholder="Street address, building, area…" style={textareaStyle} />
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Business ───────────────────────────────────────── */}
        <FormSection title="Business">
          <FormCard>
            <FormField label="GST number" help="15-character alphanumeric (auto-uppercased)">
              <input
                name="gstNumber"
                value={form.gstNumber}
                maxLength={15}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  gstNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                }))}
                placeholder="e.g. 33AABCH5436K1ZM"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Payment reminders">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.stopPaymentReminder}
                  onChange={(e) => setForm(prev => ({ ...prev, stopPaymentReminder: e.target.checked }))}
                />
                Stop Payment Reminder — never send payment reminders to staff or this customer
              </label>
            </FormField>
          </FormCard>
        </FormSection>

        <FormActions saveLabel="Save customer" loading={loading} />
      </form>
    </PageLayout>
  );
}
