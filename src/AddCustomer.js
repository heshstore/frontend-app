import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";

// Add a dummy theme if not using context (for legacy support)
const theme = {
  card: "#fff",
  border: "#e5e5e5",
  primary: "#007bff"
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

  // 🚀 STRICT MODE PATCH: Smart canonical states
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
    if (["companyName", "contactName"].includes(e.target.name)) {
      value = toSentenceCase(value);
    }
    setForm({ ...form, [e.target.name]: value });
  };

  // 🚀 STRICT MODE PATCH: FULLY LOCAL-FIRST, ONLY FALLBACK TO GOOGLE IF LOCAL EMPTY
  const handleCitySearch = async (value) => {
    setCity(value);

    if (!value) {
      setCityResults([]);
      setShowDropdown(false);
      selectedCityRef.current = { name: "", state: "", country: "" };
      return;
    }

    try {
      // FIX: Use correct backend endpoint for cities search
      const res = await fetch(
        `https://backend-service-xady.onrender.com/cities/search?q=${value.toLowerCase()}`
      );

      const data = await res.json();

      // FORMAT: Set suggestions using canonical response
      if (data.length > 0) {
        setCityResults(
          data.map((c) => ({
            name: c.name,
            state: c.state,
            country: c.country,
            source: "local",
          }))
        );
        setShowDropdown(true);
        return;
      }
    } catch (err) {}

    // FALLBACK: Call Google only if no local results
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
              predictions.map((p) => {
                const parts = p.description.split(",");

                return {
                  name: parts[0]?.trim(),
                  state: parts[1]?.trim(),
                  country: parts[2]?.trim() || "India",
                  source: "google",
                };
              })
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

    try {
      await fetch("https://backend-service-xady.onrender.com/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          city,
          state,
          country,
          mobile1: form.countryCode1 + form.mobile1,
          mobile2: form.mobile2
            ? form.countryCode2 + form.mobile2
            : "",
          creditLimit: Number(form.creditLimit) || 0,
        }),
      });

      // 🚀 STRICT MODE PATCH Step 5 - save city after customer added (STRICT MODE PATCH)
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

      console.log("SAVING CITY:", selectedCity);

      await fetch("https://backend-service-xady.onrender.com/cities/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCity.name,
          state: selectedCity.state,
          country: selectedCity.country
        }),
      });

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

  // For highlighting matched substring
  function highlightMatch(text, query) {
    if (!query) return text;
    const matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
    if (matchIndex === -1) return text;
    return (
      <>
        {text.slice(0, matchIndex)}
        <span style={{ background: "#FEF08A", borderRadius: 2 }}>{text.slice(matchIndex, matchIndex + query.length)}</span>
        {text.slice(matchIndex + query.length)}
      </>
    );
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
                    <option>Retailer</option>
                    <option>Wholesaler</option>
                    <option>Hospital</option>
                  </select>
                </div>

                {/* GST */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>GST</label>
                  <input
                    name="gstNumber"
                    value={form.gstNumber}
                    onChange={(e) => {
                      let value = e.target.value.toUpperCase();
                      value = value.replace(/[^A-Z0-9]/g, "");
                      if (value.length > 15) value = value.slice(0, 15);

                      setForm((prev) => ({
                        ...prev,
                        gstNumber: value,
                      }));
                    }}
                    style={proInputStyle}
                  />
                </div>

                {/* CREDIT */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Credit Limit</label>
                  <input
                    type="number"
                    name="creditLimit"
                    value={form.creditLimit}
                    onChange={handleChange}
                    style={proInputStyle}
                  />
                </div>

                {/* MOBILE */}
                <div style={{ marginBottom: 0 }}>
                  <label style={proLabelStyle}>Mobile *</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value="+91"
                      readOnly
                      style={{
                        width: "25%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        marginTop: 6,
                        marginBottom: 14,
                        fontSize: 14,
                        background: "#f6f8fa"
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
                      value="+91"
                      readOnly
                      style={{
                        width: "25%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        marginTop: 6,
                        marginBottom: 14,
                        fontSize: 14,
                        background: "#f6f8fa"
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
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0, // 🔥 FIX WIDTH ISSUE
                          background: "#fff",
                          border: `1px solid ${theme.border}`,
                          borderRadius: 10,
                          maxHeight: 180,
                          overflowY: "auto",
                          zIndex: 999,
                          marginTop: 4,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                      >
                        {cityResults.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setCity(item.name);
                              setState(item.state || "");
                              setCountry(item.country || "India");
                              setShowDropdown(false);
                              // Save the selected city for backend saving
                              selectedCityRef.current = {
                                name: item.name,
                                state: item.state || "",
                                country: item.country || "India"
                              };
                            }}
                            style={{
                              padding: 12,
                              cursor: "pointer",
                              borderBottom: `1px solid ${theme.border}`,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#f9fafb")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {highlightMatch(item.name, city)}
                              </div>

                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {item.state}, {item.country}
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 6,
                                background:
                                  item.source === "local" ? "#DCFCE7" : "#DBEAFE",
                                color:
                                  item.source === "local" ? "#166534" : "#1E40AF",
                                fontWeight: 500,
                              }}
                            >
                              {item.source === "local" ? "Saved" : "Google"}
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
const header = { display: "flex", justifyContent: "center", position: "relative", padding: 14 };
const backBtn = { position: "absolute", left: 15 };
const container = { display: "flex", justifyContent: "center", padding: 20 };
const mobileRow = { display: "flex", gap: 10 };
const codeBox = { width: "25%" };
const mobileBox = { width: "75%" };
const saveBtn = { width: "100%", padding: 14, background: "#4facfe", color: "#fff" };
const fetchBtn = { marginTop: 8 };