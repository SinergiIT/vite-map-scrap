export default function Alert({ text, type = "error" }) {
  let alertClass;

  switch (type) {
    case "error":
      alertClass = "bg-red-700 border-red-800";
      break;
    case "info":
      alertClass = "bg-yellow-700 border-yellow-800";
      break;
    case "success":
      alertClass = "bg-emerald-700 border-emerald-800";
      break;
    default:
      alertClass = "bg-slate-700 border-slate-800";
      break;
  }

  return (
    <div
      className={`z-50 sticky w-fit top-[50px] left-1/2 -translate-x-1/2 ${alertClass} bg-opacity-60 text-xl font-light border-2 px-10 py-2 rounded-full text-white`}
    >
      {text}
    </div>
  );
}
