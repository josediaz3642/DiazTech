"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import s from "./EntityCombobox.module.css";

export interface EntityItem {
  id: string;
  name: string;
  cuit?: string | null;
  taxCategory?: string | null;
}

interface EntityComboboxProps {
  items: EntityItem[];
  value: string;
  onChange: (id: string, selectedItem?: EntityItem) => void;
  placeholder?: string;
  allowConsumidorFinal?: boolean;
  disabled?: boolean;
}

export default function EntityCombobox({
  items,
  value,
  onChange,
  placeholder = "Buscar...",
  allowConsumidorFinal = false,
  disabled = false,
}: EntityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === value);
  }, [items, value]);

  // Set the search text based on current value when not editing
  useEffect(() => {
    if (selectedItem) {
      setSearch(selectedItem.name);
    } else if (value === "consumidor-final" && allowConsumidorFinal) {
      setSearch("Consumidor Final");
    } else {
      setSearch("");
    }
  }, [selectedItem, value, allowConsumidorFinal]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();

    // If search is exactly the selected item's name, or "Consumidor Final",
    // show all options when opening.
    if (selectedItem && selectedItem.name === search) {
      return items;
    }
    if (value === "consumidor-final" && search === "Consumidor Final") {
      return items;
    }

    if (!q) return items;

    return items.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const cuitMatch = item.cuit ? item.cuit.includes(q) : false;
      return nameMatch || cuitMatch;
    });
  }, [items, search, selectedItem, value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search term to current selection
        if (selectedItem) {
          setSearch(selectedItem.name);
        } else if (value === "consumidor-final") {
          setSearch("Consumidor Final");
        } else {
          setSearch("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem, value]);

  const handleSelect = (id: string, item?: EntityItem) => {
    onChange(id, item);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className={s.container} ref={containerRef}>
      <div className={s.inputWrapper}>
        <input
          type="text"
          className={s.input}
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
        />
        {search && !disabled && (
          <button
            type="button"
            className={s.clearButton}
            onClick={handleClear}
            title="Limpiar"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className={s.dropdown}>
          {allowConsumidorFinal && (
            <div
              className={s.item}
              onClick={() => handleSelect("consumidor-final")}
              style={{ borderBottom: "1px solid var(--border-primary)" }}
            >
              <div className={s.itemName}>Consumidor Final</div>
              <div className={s.itemSub}>Sin identificar</div>
            </div>
          )}

          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={s.item}
                onClick={() => handleSelect(item.id, item)}
              >
                <div className={s.itemName}>{item.name}</div>
                {item.cuit && (
                  <div className={s.itemSub}>
                    CUIT: {item.cuit} {item.taxCategory ? `— ${item.taxCategory}` : ""}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={s.empty}>No se encontraron resultados</div>
          )}
        </div>
      )}
    </div>
  );
}
