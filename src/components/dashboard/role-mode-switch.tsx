type RoleMode = "CLIENT" | "MANAGER";

type RoleModeSwitchProps = {
  mode: RoleMode;
  onModeChange: (mode: RoleMode) => void;
  canUseManagerMode: boolean;
};

export function RoleModeSwitch({ mode, onModeChange, canUseManagerMode }: RoleModeSwitchProps) {
  return (
    <nav className="surface tab-strip p-2" aria-label="Modes espace investment">
      <button
        type="button"
        onClick={() => onModeChange("CLIENT")}
        className={`tab-pill ${mode === "CLIENT" ? "tab-pill-active" : ""}`}
      >
        Espace Investisseur
      </button>
      <button
        type="button"
        onClick={() => onModeChange("MANAGER")}
        className={`tab-pill ${mode === "MANAGER" ? "tab-pill-active" : ""}`}
        disabled={!canUseManagerMode}
        title={canUseManagerMode ? "Basculer en mode gestionnaire" : "Réservé aux rôles collaborateur/admin"}
      >
        Espace Gestionnaire / Conseiller
      </button>
    </nav>
  );
}
