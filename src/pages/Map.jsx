/* eslint-disable no-unused-vars */
"use client"; // Membutuhkan "use client" untuk menggunakan hooks di Next.js app router
import { useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import * as XLSX from "xlsx"; // Import XLSX untuk membaca file Excel
import { saveAs } from "file-saver";

// Atur icon default untuk Leaflet agar marker muncul dengan benar
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function Map() {
  let [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [countData, setCountData] = useState(0);
  let [dataFail, setDataFail] = useState([]);
  const [index, setIndex] = useState(0);
  const abortControllerRef = useRef(null);

  const handleFileUploadName = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    abortControllerRef.current = new AbortController();
    setDataFail([]);
    localStorage.setItem("fail", JSON.stringify([]));
    setResult([]);
    localStorage.setItem("result", JSON.stringify([]));
    setIndex(0);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      const binaryStr = evt.target.result;
      const workbook = XLSX.read(binaryStr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log("data :", data);
      setCountData(data.length);

      const fetchNewData = async (fromLocation, toLocation) => {
        try {
          const response = await axios.post(
            "http://localhost:3005/api/distance",
            {
              fromLocation,
              toLocation,
            },
            {
              signal: abortControllerRef.current.signal,
            }
          );
          return {
            startLoc: response.data.nameStart,
            finishLoc: response.data.nameFinish,
            carDistance: response.data.carDistance.distance,
            carDuration: response.data.carDistance.duration,
            motorDistance: response.data.motorDistance.distance,
            motorDuration: response.data.motorDistance.duration,
            start: response.data.coordStart,
            finish: response.data.coordFinish,
            rawStart: fromLocation,
            rawFinish: toLocation,
            status: "success", // Menandakan bahwa pengambilan data berhasil
          };
        } catch (error) {
          console.error("Error fetching data:", error);
          return {
            start: fromLocation,
            finish: toLocation,
            status: "error", // Menandakan bahwa pengambilan data gagal
          };
        }
      };

      for (const [index, item] of data.entries()) {
        const result = await fetchNewData(item.start, item.finish);
        setIndex(index + 1);
        if (result.status === "success") {
          setResult((prevResult) => {
            const updatedResult = [...prevResult, result];
            localStorage.setItem("result", JSON.stringify(updatedResult));
            return updatedResult;
          });
        } else {
          setDataFail((prevDataFail) => {
            const updatedDataFail = [...prevDataFail, result];
            localStorage.setItem("fail", JSON.stringify(updatedDataFail));
            return updatedDataFail;
          });
        }
      }

      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleDownloadResult = (value) => {
    if (result.length === 0 && value === "success") {
      alert("No data available to download");
      return;
    } else if (dataFail.length === 0 && value === "fail") {
      alert("No data available to download");
      return;
    }
    let data = [];
    if (value === "success") {
      // Format data menjadi array of objects
      data = result.map((item, index) => ({
        Start_Coordinates: item.start[0] + ", " + item.start[1],
        Finish_Coordinates: item.finish[0] + ", " + item.finish[1],
        Data_Start: `${item.rawStart}`,
        Map_Start: `${item.startLoc}`,
        Data_Finish: `${item.rawFinish}`,
        Map_Finish: `${item.finishLoc}`,
        Car_Distance: `${item.carDistance}`,
        Car_Duration: `${item.carDuration}`,
        Motor_Distance: `${item.motorDistance}`,
        Motor_Duration: `${item.motorDuration}`,
      }));
    } else if (value === "fail") {
      data = dataFail.map((item, index) => ({
        start: item.start,
        finish: item.finish,
      }));
    }

    // Buat worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Buat workbook dan tambahkan worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Routes");

    // Konversi workbook menjadi file Excel
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // Simpan file dengan nama
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    if (value === "success") {
      saveAs(blob, "scrapped_data.xlsx");
    } else if (value === "fail") {
      saveAs(blob, "failed_data.xlsx");
    }
  };

  if (result.length === 0 && JSON.parse(localStorage.getItem("result"))) {
    result = JSON.parse(localStorage.getItem("result"));
  }

  if (dataFail.length === 0 && JSON.parse(localStorage.getItem("fail"))) {
    dataFail = JSON.parse(localStorage.getItem("fail"));
  }

  const handleDelete = () => {
    setResult([]); // Reset state data
    setDataFail([]); // Reset state data
    localStorage.removeItem("result"); // Hapus data dari local storage
    localStorage.removeItem("fail"); // Hapus data dari local storage
    window.location.reload();
  };

  return (
    <div className="bg-slate-200">
      <div
        className={`w-full min-h-screen flex flex-col ${
          result.length > 0 ? "" : "justify-center"
        } p-20`}
      >
        <div className="h-full flex flex-col items-center justify-center">
          <h1
            className={`${
              result.length > 0 ? "text-4xl" : "text-4xl mb-16"
            } text-black font-bold mb-4`}
          >
            SCRAP DATA JARAK DARI MAP
          </h1>
          <div className="flex items-center gap-10">
            <label
              className={`${
                loading
                  ? "bg-slate-700"
                  : "bg-blue-700 hover:bg-blue-800 cursor-pointer"
              } text-white rounded-md px-4 py-2`}
              htmlFor="file-name"
            >
              {loading ? (
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-y-yellow-500 border-l-yellow-500 border-r-yellow-200"></div>
                  <p className="ml-2">
                    Mengupload data... [{index}/{countData}]
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <i className="fa-solid fa-upload mr-2"></i> <p>Choose File</p>
                </div>
              )}
            </label>
            {loading && (
              <div
                className="bg-red-700 text-white rounded-md px-4 py-2 hover:bg-red-800 cursor-pointer"
                onClick={() => {
                  setLoading(false);
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort(); // Hentikan semua request yang sedang berlangsung
                  }
                }}
              >
                Cancel
              </div>
            )}
            {(result.length > 0 || dataFail.length > 0) && !loading && (
              <button
                onClick={handleDelete}
                className="bg-red-700 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-red-800"
              >
                <i className="fa-solid fa-trash mr-2"></i> Delete Data
              </button>
            )}
          </div>
          <input
            id="file-name"
            className="hidden"
            type="file"
            accept=".xlsx, .xls"
            disabled={loading}
            onChange={handleFileUploadName}
          />
        </div>
        {result.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-5 mb-2">
              <h1 className="text-2xl font-bold">&raquo; Hasil Scrap</h1>
              <button
                onClick={() => handleDownloadResult("success")}
                className="bg-emerald-700 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-emerald-800"
              >
                <i className="fa-solid fa-download mr-2"></i> Download Hasil
                Scrap
              </button>
            </div>
            <div className="grid grid-cols-11 bg-slate-900 text-white text-center font-semibold">
              <div className="col-span-1 py-4">No.</div>
              <div className="col-span-3 py-4">Start</div>
              <div className="col-span-3 py-4">Finish</div>
              <div className="col-span-2 py-4">Mobil</div>
              <div className="col-span-2 py-4">Motor</div>
            </div>
            {result?.map((item, index) => (
              <div key={index} className="grid grid-cols-11">
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-slate-400" : "bg-slate-300"
                  } bg-opacity-30 col-span-1 text-center px-3 py-2`}
                >
                  {index + 1}
                </div>
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-slate-400" : "bg-slate-300"
                  } bg-opacity-30 col-span-3 px-3 py-2`}
                >
                  {item?.startLoc} ({item?.rawStart}) - [{item?.start[0]},{" "}
                  {item?.start[1]}]
                </div>
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-slate-400" : "bg-slate-300"
                  } bg-opacity-30 col-span-3 px-3 py-2`}
                >
                  {item?.finishLoc} ({item?.rawFinish}) - [{item?.finish[0]},{" "}
                  {item?.finish[1]}]
                </div>
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-slate-400" : "bg-slate-300"
                  } bg-opacity-30 col-span-2 px-3 py-2 text-center`}
                >
                  {item?.carDistance} ({item?.carDuration})
                </div>
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-slate-400" : "bg-slate-300"
                  } bg-opacity-30 col-span-2 px-3 py-2 text-center`}
                >
                  {item?.motorDistance} ({item?.motorDuration})
                </div>
              </div>
            ))}
          </>
        )}
        {dataFail.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-10 mb-2">
              <h1 className="text-2xl font-bold">&raquo; Data Gagal</h1>
              <button
                onClick={() => handleDownloadResult("fail")}
                className="bg-emerald-700 text-white rounded-md px-4 py-2 cursor-pointer hover:bg-emerald-800"
              >
                <i className="fa-solid fa-download mr-2"></i> Download Data
                Gagal
              </button>
            </div>
            <div className="grid grid-cols-7 bg-red-900 text-white text-center font-semibold">
              <div className="col-span-1 py-4">No.</div>
              <div className="col-span-3 py-4">Start</div>
              <div className="col-span-3 py-4">Finish</div>
            </div>
            {dataFail?.map((item, index) => (
              <div key={index} className="grid grid-cols-7">
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-red-600" : "bg-red-300"
                  } bg-opacity-10 col-span-1 text-center px-3 py-2`}
                >
                  {index + 1}
                </div>
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-red-600" : "bg-red-300"
                  } bg-opacity-10 text-center col-span-3 px-3 py-2`}
                >
                  {item?.start}
                </div>
                <div
                  className={`${
                    index % 2 !== 0 ? "bg-red-600" : "bg-red-300"
                  } bg-opacity-10 text-center col-span-3 px-3 py-2`}
                >
                  {item.finish}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
