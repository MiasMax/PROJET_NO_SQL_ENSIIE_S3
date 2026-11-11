import React from 'react';
import { BarChart3 } from 'lucide-react';
import { RARITY_CONFIG } from './boosterConstants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const ORDERED_RATES = [
  RARITY_CONFIG.SECRET,
  RARITY_CONFIG.ULTRA,
  RARITY_CONFIG.HOLO,
  RARITY_CONFIG.RARE,
  RARITY_CONFIG.UNCOMMON,
  RARITY_CONFIG.COMMON,
];

export default function PullRatesModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Modal.Header
        title="Probabilités de tirage"
        subtitle="Répartition des 10 emplacements par booster scellé"
        icon={<BarChart3 size={18} className="text-neo-cobalt" />}
      />

      <Modal.Body className="space-y-4">
        <p className="text-xs text-neo-ink-2 leading-relaxed">
          Chaque booster contient 10 cartes : 5 communes garanties, 3 peu communes garanties,
          1 emplacement Rare ou supérieur et 1 emplacement Hit (Holo, Ultra ou Secrète).
        </p>

        <div className="border-[1.5px] border-neo-border rounded-[8px] overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neo-muted border-b-[1.5px] border-neo-border text-[11px] uppercase tracking-wider text-neo-ink-3">
                <th className="py-2.5 px-3.5">Catégorie</th>
                <th className="py-2.5 px-3.5">Emplacement</th>
                <th className="py-2.5 px-3.5 text-right">Taux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neo-border">
              {ORDERED_RATES.map((row) => (
                <tr key={row.key}>
                  <td className="py-2.5 px-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-[4px] border font-bold ${row.badgeClass}`}>
                      {row.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-neo-ink-2">{row.slotInfo}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-neo-ink">
                    {row.prob}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" size="sm" onClick={onClose}>
          Compris
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

