export default function Loading({ message = 'লোড হচ্ছে...' }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}
