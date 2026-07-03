import { useState, useEffect } from 'react';
import { apiFetch } from './api';

const CACHE_KEY = 'saachu_current_version';

// undefined = not yet fetched, null = fetched but unavailable, string = version label
let _version = undefined;
let _promise = null;

export function useDeployedVersion() {
  const [version, setVersion] = useState(
    _version !== undefined ? _version : (localStorage.getItem(CACHE_KEY) ?? null)
  );

  useEffect(() => {
    if (_version !== undefined) { setVersion(_version); return; }
    if (!_promise) {
      _promise = apiFetch('/deployment-versions')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          const cur = list.find(v => v.deployment_status === 'RELEASED') ?? list[0] ?? null;
          _version = cur?.version ?? null;
          if (_version) localStorage.setItem(CACHE_KEY, _version);
          return _version;
        })
        .catch(() => { _version = null; return null; });
    }
    let live = true;
    _promise.then(v => { if (live) setVersion(v); });
    return () => { live = false; };
  }, []);

  return version;
}
