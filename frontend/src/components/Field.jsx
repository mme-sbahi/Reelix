export default function Field({ icon: Icon, ...props }) {
  return (
    <label className="ht-field">
      <Icon size={16} className="ht-field__icon" />
      <input {...props} className="ht-field__input" />
    </label>
  );
}
