import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import { API_URL } from "./config";

const theme = {
  card: "#fff",
  border: "#e5e5e5",
  primary: "#0066B3",
};

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

export default function AddCustomer() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    countryCode1: "+91",
    mobile1: "",
    countryCode2: "+91",
    mobile2: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    gstNumber: "",
    customerType: "",
    tag: "",
    creditLimit: 0,
  });

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");

  const [cityResults, setCityResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Store selectedCity for save API strict mode patch
  const selectedCityRef = useRef({ name: "", state: "", country: "" });

  const toSentenceCase = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleMobileChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.startsWith("0")) value = value.substring(1);
    if (value.length > 10) value = value.slice(0, 10);

    setForm((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  const handleChange = (e) => {
    let value = e.target.value;
    if (["companyName", "contactName", "tag"].includes(e.target.name)) {
      value = toSentenceCase(value);
    }
    setForm({ ...form, [e.target.name]: value });
  };

  /** Save a city to the local DB in the background (fire-and-forget). */
  const syncCityToDB = async (cityData) => {
    try {
      await fetch(`${API_URL}/cities/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cityData),
      });
    } catch {
      // non-critical
    }
  };

  const handleCitySelect = (place) => {
    let cityName = "";
    let stateName = "";
    let countryName = "";
    let countryISO = "";

    if (place.address_components) {
      // Google Places result
      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("locality")) cityName = component.long_name;
        if (types.includes("administrative_area_level_1")) stateName = component.long_name;
        if (types.includes("country")) {
          countryName = component.long_name;
          countryISO = component.short_name; // e.g. "IN", "US"
        }
      });

      const callingCode = ISO_TO_CALLING_CODE[countryISO] || "+91";

      setCity(cityName);
      setState(stateName);
      setCountry(countryName);
      setForm(prev => ({
        ...prev,
        countryCode1: callingCode,
        countryCode2: callingCode,
      }));

      selectedCityRef.current = { name: cityName, state: stateName, country: countryName };

      // Immediately persist to local DB so future searches find it
      syncCityToDB({ name: cityName, state: stateName, country: countryName, countryISO, countryCode: callingCode });

    } else {
      // Local DB result
      const callingCode = place.countryCode || ISO_TO_CALLING_CODE[place.countryISO] || "+91";

      setCity(place.name);
      setState(place.state || "");
      setCountry(place.country || "India");
      setForm(prev => ({
        ...prev,
        countryCode1: callingCode,
        countryCode2: callingCode,
      }));

      selectedCityRef.current = {
        name: place.name,
        state: place.state || "",
        country: place.country || "India",
      };
    }
  };

  // --- The rest of the unchanged code below ---

  const handleCitySearch = async (value) => {
    setCity(value);

    if (!value) {
      setCityResults([]);
      setShowDropdown(false);
      selectedCityRef.current = { name: "", state: "", country: "" };
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/cities/search?q=${encodeURIComponent(value)}`
      );
      const data = await res.json();

      if (data.length > 0) {
        setCityResults(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            state: c.state,
            country: c.country,
            countryISO: c.countryISO,
            countryCode: c.countryCode,
            label: `${c.name}, ${c.state}, ${c.country}`,
            source: "saved",
          }))
        );
        setShowDropdown(true);
        return;
      }
    } catch (err) {}

    if (window.google) {
      const service = new window.google.maps.places.AutocompleteService();

      service.getPlacePredictions(
        {
          input: value,
          types: ["(cities)"],
        },
        (predictions) => {
          if (predictions) {
            setCityResults(
              predictions.map((p) => ({
                place_id: p.place_id,
                description: p.description,
                label: p.description,
                source: "google",
              }))
            );
            setShowDropdown(true);
          }
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.companyName || !form.mobile1 || !form.tag) {
      alert("Company Name, Tag & Mobile required");
      return;
    }

    if (form.mobile1.length !== 10) {
      alert("Mobile must be 10 digits");
      return;
    }

    const selectedCity =
      selectedCityRef.current && selectedCityRef.current.name
        ? selectedCityRef.current
        : {
            name: city,
            state: state || "",
            country: country || "India",
          };

    if (!selectedCity.name) {
      alert("Please select a city from dropdown");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          city,
          state,
          country,
          mobile1: form.countryCode1 + form.mobile1,
          mobile2: form.mobile2 ? form.countryCode2 + form.mobile2 : "",
          creditLimit: Number(form.creditLimit) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error saving customer");
        return;
      }

      alert("Customer Added ✅");
      navigate("/dashboard");
    } catch {
      alert("Error saving customer");
    }
  };

  // PRO INPUT STYLE
  const proInputStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    marginTop: 6,
    marginBottom: 14,
    fontSize: 14,
    background: "#fff",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  };

  const proLabelStyle = {
    fontWeight: 600,
    marginBottom: 4
  };

  // Helper for dropdown: For local city, nicely formats fallback
  function formatCustomer(c) {
    if (c.label) return c.label;
    if (c.name && c.state && c.country) return `${c.name}, ${c.state}, ${c.country}`;
    if (c.description) return c.description;
    return c.name || "";
  }

  return (
    <PageLayout title="Add Customer">
      <div style={{ background: "#f4f6fb", minHeight: "100vh" }}>
        <div style={container}>
          <div
            style={{
              background: theme.card,
              padding: 16,
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              width: "100%",
              maxWidth: 480,
              overflow: "visible",
              position: "relative",
              zIndex: 1,
            }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { label: "Company Name *", name: "companyName" },
                  { label: "Contact Person", name: "contactName" },
                  { label: "Email", name: "email" },
                  { label: "Tag *", name: "tag" },
                ].map((f) => (
                  <div key={f.name} style={{ marginBottom: 0 }}>
                    <label style={proLabelStyle}>{f.label}</label>
                    <input
                      name={f.name}
                      value={form[f.name]}
                      onChange={handleChange}
                      style={proInputStyle}
                    />
                  </div>
                ))}

                {/* CUSTOMER TYPE */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Customer Type</label>
                  <select
                    name="customerType"
                    value={form.customerType}
                    onChange={handleChange}
                    style={proInputStyle}
                  >
                    <option value="">Select</option>
                    <option>Retail Shops</option>
                    <option>Chain Stores</option>
                    <option>Hospitals & Clinics</option>
                    <option>Wholesaler</option>
                    <option>Cr Lab</option>
                    <option>Grinders</option>
                    <option>Brands</option>
                  </select>
                </div>

                {/* GST */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Gst No</label>
                  <input
                    name="gstNumber"
                    value={form.gstNumber}
                    maxLength={15}
                    onChange={(e) => {
                      let value = e.target.value.toUpperCase();
                      value = value.replace(/[^A-Z0-9]/g, "");

                      setForm((prev) => ({
                        ...prev,
                        gstNumber: value,
                      }));
                    }}
                    style={proInputStyle}
                  />
                </div>

                {/* MOBILE */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Mobile *</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={form.countryCode1}
                      readOnly
                      title="Auto-set from city selection"
                      style={{
                        width: "25%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        marginTop: 6,
                        marginBottom: 14,
                        fontSize: 14,
                        background: "#eef4fb",
                        color: theme.primary,
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    />
                    <input
                      name="mobile1"
                      value={form.mobile1}
                      onChange={handleMobileChange}
                      style={{
                        width: "75%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        marginTop: 6,
                        marginBottom: 14,
                        fontSize: 14,
                        background: "#fff"
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Mobile 2</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={form.countryCode2}
                      readOnly
                      title="Auto-set from city selection"
                      style={{
                        width: "25%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        marginTop: 6,
                        marginBottom: 14,
                        fontSize: 14,
                        background: "#eef4fb",
                        color: theme.primary,
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    />
                    <input
                      name="mobile2"
                      value={form.mobile2}
                      onChange={handleMobileChange}
                      style={{
                        width: "75%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        marginTop: 6,
                        marginBottom: 14,
                        fontSize: 14,
                        background: "#fff"
                      }}
                    />
                  </div>
                </div>

                {/* ADDRESS */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    style={{
                      ...proInputStyle,
                      height: 70,
                      resize: "vertical"
                    }}
                  />
                </div>

                {/* PINCODE */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Pincode</label>
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value.length > 6) value = value.slice(0, 6);

                      setForm((prev) => ({
                        ...prev,
                        pincode: value,
                      }));
                    }}
                    style={proInputStyle}
                  />
                </div>

                {/* CITY */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>City</label>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                    }}
                  >
                    <input
                      value={city}
                      onChange={(e) => handleCitySearch(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search city"
                      style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 12,
                        border: `1px solid ${theme.border}`,
                        boxSizing: "border-box",
                      }}
                    />
                    {showDropdown && cityResults.length > 0 && (
                      <div
                        // STEP 2: Replace with strictly these styles
                        style={{
                          position: "absolute",
                          zIndex: 99999,
                          width: "100%",
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          marginTop: 4,
                          maxHeight: 200,
                          overflowY: "auto",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          pointerEvents: "auto"
                        }}
                      >
                        {/* STEP 3/4: Replace dropdown list rendering */}
                        {cityResults.map((c) => (
                          <div
                            key={c.id || c.place_id}
                            style={{
                              padding: 10,
                              cursor: "pointer",
                              borderBottom: "1px solid #eee"
                            }}
                            onMouseDown={async () => {
                              // Google Place: fetch details first
                              if (c.source === "google" && window.google) {
                                const service = new window.google.maps.places.PlacesService(
                                  document.createElement("div")
                                );
                                // STEP 3: ADD LOADING LOCK (VERY IMPORTANT)
                                // setShowDropdown(false);  // Remove from here and move to success block below
                                service.getDetails(
                                  { placeId: c.place_id },
                                  (place, status) => {

                                    if (
                                      status === window.google.maps.places.PlacesServiceStatus.OK &&
                                      place &&
                                      place.address_components
                                    ) {
                                      handleCitySelect(place);
                                      setShowDropdown(false); // ✅ MOVE HERE
                                    } else {
                                      alert("Failed to load city details. Try again.");
                                    }

                                  }
                                );
                              } else {
                                handleCitySelect(c);
                                setShowDropdown(false);
                              }
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                {c.label || c.description || formatCustomer(c)}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  background: c.source === "saved" ? "#d1fae5" : "#dbeafe",
                                  color: c.source === "saved" ? "#065f46" : "#1e40af",
                                  marginLeft: 8
                                }}
                              >
                                {c.source === "saved" ? "Saved" : "Google"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* STATE - show only the state field (no button) */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontWeight: 600 }}>State</label>
                  <input
                    value={state}
                    readOnly
                    style={{
                      ...proInputStyle,
                      background: "#f3f4f6"
                    }}
                  />
                </div>

                {/* COUNTRY */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Country</label>
                  <input
                    value={country}
                    readOnly
                    style={{
                      ...proInputStyle,
                      background: "#f3f4f6"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: 14,
                    background: "#4facfe",
                    color: "#fff",
                    borderRadius: 12,
                    border: "none",
                    marginTop: 8,
                    fontWeight: 600,
                    fontSize: 16,
                    letterSpacing: "1px",
                    cursor: "pointer"
                  }}
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

/* STYLES */
const container = { display: "flex", justifyContent: "center", padding: 20 };