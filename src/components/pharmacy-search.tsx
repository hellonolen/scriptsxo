"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Search, MapPin, Phone, Printer, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PharmacyResult {
  npi: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  fax: string;
}

interface PharmacySearchProps {
  onSelect?: (pharmacy: PharmacyResult) => void;
  className?: string;
}

export function PharmacySearch({ onSelect, className = "" }: PharmacySearchProps) {
  const searchPharmacy = useAction(api.actions.lookupPharmacy.search);

  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query && !zip) return;
    setSearching(true);
    setResults([]);
    try {
      const data = await searchPharmacy({
        name: query || undefined,
        state: state || undefined,
        zip: zip || undefined,
      });
      setResults(data);
    } catch (err) {
      console.error("Pharmacy search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (pharmacy: PharmacyResult) => {
    setSelected(pharmacy.npi);
    onSelect?.(pharmacy);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search inputs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            placeholder="Pharmacy name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>
        <input
          type="text"
          placeholder="State (FL)"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
          className="w-20 px-3 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-center"
        />
        <input
          type="text"
          placeholder="ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value.slice(0, 5))}
          className="w-24 px-3 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-center"
        />
        <Button onClick={handleSearch} disabled={searching} size="sm">
          {searching ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="border border-border rounded-sm divide-y divide-border max-h-[400px] overflow-y-auto">
          {results.map((pharmacy) => (
            <div
              key={pharmacy.npi}
              className={`p-4 hover:bg-muted/20 transition-colors cursor-pointer ${
                selected === pharmacy.npi ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
              onClick={() => handleSelect(pharmacy)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{pharmacy.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={11} className="text-muted-foreground shrink-0" aria-hidden="true" />
                    <p className="text-[11px] text-muted-foreground truncate">
                      {pharmacy.address.street}, {pharmacy.address.city}, {pharmacy.address.state} {pharmacy.address.zip}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    {pharmacy.phone && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone size={10} aria-hidden="true" />
                        {pharmacy.phone}
                      </span>
                    )}
                    {pharmacy.fax && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Printer size={10} aria-hidden="true" />
                        {pharmacy.fax}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">NPI: {pharmacy.npi}</p>
                </div>
                {selected === pharmacy.npi && (
                  <Check size={16} className="text-primary shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && (query || zip) && (
        <p className="text-sm text-muted-foreground font-light text-center py-6">
          Search for a pharmacy by name, state, or ZIP code.
        </p>
      )}
    </div>
  );
}
