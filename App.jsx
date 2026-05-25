import React, { useMemo, useState } from "react";
import { ArrowRight, Calculator, CheckCircle2, Download, Hammer, Home, Mail, MapPin, Phone, RotateCcw, Sparkles, UserRound } from "lucide-react";

const DEFAULT_FOUNDATION_UNIT_PRICE = 4500000;
const DEFAULT_CONSTRUCTION_UNIT_PRICE = 6700000;

const defaultInput = {
  ownerName: "Anh/Chị Chủ Nhà",
  customerEmail: "",
  customerPhone: "",
  location: "Quận 1, TP. Hồ Chí Minh",
  landArea: 100,
  frontWidth: 4,
  constructionArea: 80,
  floors: 3,
  layoutMode: "with_rooftop",
  rooftopIndoorArea: 30,
  balconyDepth: 1.2,
  foundationUnitPrice: DEFAULT_FOUNDATION_UNIT_PRICE,
  constructionUnitPrice: DEFAULT_CONSTRUCTION_UNIT_PRICE,
};

const coefficients = {
  pileFoundation: 0.4,
  yardFoundation: 0.3,
  floor1: 1,
  yard: 0.5,
  upperFloors: 1,
  rooftopIndoor: 1,
  rooftopTerrace: 0.5,
  roof: 0.5,
};

const quoteHeaders = ["STT", "Hạng mục", "Diện tích", "Hệ số", "Đơn giá", "Thành tiền"];

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  if (value === null || value === undefined) return "—";
  return Math.round(value).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function formatArea(value) {
  return `${Math.round(value * 10) / 10} m²`;
}

function getLayoutLabel(floors, layoutMode) {
  if (floors <= 1) return "1 trệt";
  if (floors === 2) return "1 trệt 1 lầu";
  if (layoutMode === "with_rooftop") return `1 trệt ${Math.max(1, floors - 2)} lầu 1 tầng thượng`;
  return `1 trệt ${floors - 1} lầu`;
}

function createRow({ item, physicalArea, coefficient, unitPrice }) {
  const hasPrice = physicalArea !== null && coefficient !== null && unitPrice !== null;
  const billableArea = hasPrice ? physicalArea * coefficient : null;
  return {
    item,
    physicalArea,
    coefficient,
    billableArea,
    unitPrice,
    amount: hasPrice ? billableArea * unitPrice : null,
  };
}

function buildQuote(input) {
  const landArea = toNumber(input.landArea);
  const frontWidth = toNumber(input.frontWidth);
  const constructionArea = toNumber(input.constructionArea);
  const floors = Math.max(1, Math.floor(toNumber(input.floors)));
  const balconyDepth = toNumber(input.balconyDepth);
  const foundationUnitPrice = toNumber(input.foundationUnitPrice) || DEFAULT_FOUNDATION_UNIT_PRICE;
  const constructionUnitPrice = toNumber(input.constructionUnitPrice) || DEFAULT_CONSTRUCTION_UNIT_PRICE;
  const canChooseLayout = floors >= 3;
  const hasRooftop = canChooseLayout && input.layoutMode === "with_rooftop";
  const layoutLabel = getLayoutLabel(floors, input.layoutMode);
  const yardArea = Math.max(0, landArea - constructionArea);
  const balconyArea = frontWidth * balconyDepth;
  const upperFloorArea = constructionArea + balconyArea;
  const upperFloorsCount = hasRooftop ? Math.max(0, floors - 2) : Math.max(0, floors - 1);
  const rooftopIndoorArea = hasRooftop ? toNumber(input.rooftopIndoorArea) : 0;
  const rooftopTotalArea = upperFloorArea;
  const rooftopTerraceArea = Math.max(0, rooftopTotalArea - rooftopIndoorArea);
  const roofArea = hasRooftop ? rooftopIndoorArea + balconyArea : floors >= 2 ? upperFloorArea : constructionArea;

  const errors = [];
  if (!String(input.ownerName).trim()) errors.push("Tên chủ nhà không được để trống.");
  if (!String(input.location).trim()) errors.push("Vị trí xây dựng không được để trống.");
  if (constructionArea > landArea) errors.push("Diện tích xây dựng không được lớn hơn tổng diện tích lô đất.");
  if (hasRooftop && rooftopIndoorArea > rooftopTotalArea) errors.push("Phần trong nhà tầng thượng không được lớn hơn tổng diện tích tầng thượng.");

  const rows = [
    createRow({ item: "Gia cố móng", physicalArea: null, coefficient: null, unitPrice: null }),
    createRow({ item: "Móng cọc phần trong nhà", physicalArea: constructionArea, coefficient: coefficients.pileFoundation, unitPrice: foundationUnitPrice }),
    createRow({ item: "Móng đơn phần sân", physicalArea: yardArea, coefficient: coefficients.yardFoundation, unitPrice: foundationUnitPrice }),
    createRow({ item: "Tầng trệt", physicalArea: constructionArea, coefficient: coefficients.floor1, unitPrice: constructionUnitPrice }),
    createRow({ item: "Sân trước và sân sau", physicalArea: yardArea, coefficient: coefficients.yard, unitPrice: constructionUnitPrice }),
    ...Array.from({ length: upperFloorsCount }, (_, index) =>
      createRow({
        item: `Lầu ${index + 1}`,
        physicalArea: upperFloorArea,
        coefficient: coefficients.upperFloors,
        unitPrice: constructionUnitPrice,
      })
    ),
    createRow({
      item: "Tầng thượng phần trong nhà",
      physicalArea: hasRooftop ? rooftopIndoorArea : 0,
      coefficient: coefficients.rooftopIndoor,
      unitPrice: constructionUnitPrice,
    }),
    createRow({
      item: "Sân thượng",
      physicalArea: hasRooftop ? rooftopTerraceArea : 0,
      coefficient: coefficients.rooftopTerrace,
      unitPrice: constructionUnitPrice,
    }),
    createRow({ item: "Tầng mái", physicalArea: roofArea, coefficient: coefficients.roof, unitPrice: constructionUnitPrice }),
  ].map((row, index) => ({ order: index + 1, ...row }));

  return {
    landArea,
    frontWidth,
    constructionArea,
    floors,
    balconyDepth,
    canChooseLayout,
    hasRooftop,
    layoutLabel,
    yardArea,
    balconyArea,
    totalBillableArea: rows.reduce((sum, row) => sum + (row.billableArea ?? 0), 0),
    totalAmount: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    rows,
    errors,
  };
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C51605] focus:ring-4 focus:ring-[#C51605]/10";
}

function formatPlainMoney(value) {
  const numberValue = toNumber(value);
  return numberValue ? Math.round(numberValue).toLocaleString("vi-VN") : "";
}

function parsePlainMoney(value) {
  return String(value).replace(/[^0-9]/g, "");
}

function Field({ label, suffix, children, labelClassName = "text-white" }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${labelClassName}`}>{label}</span>
        {suffix && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">{suffix}</span>}
      </div>
      {children}
    </label>
  );
}

function MoneyField({ label, value, onChange, suffix = "VNĐ/m²", step = 50000 }) {
  const numericValue = toNumber(value);
  const adjust = (amount) => onChange(String(Math.max(0, numericValue + amount)));

  return (
    <Field label={label} suffix={suffix} labelClassName="text-slate-700">
      <div className="flex overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm transition focus-within:border-[#C51605] focus-within:ring-4 focus-within:ring-[#C51605]/10">
        <input
          type="text"
          inputMode="numeric"
          value={formatPlainMoney(value)}
          onChange={(e) => onChange(parsePlainMoney(e.target.value))}
          className="w-full border-0 bg-transparent px-4 py-3 text-sm font-black text-slate-950 outline-none"
        />
        <div className="flex border-l border-slate-300 bg-slate-200">
          <button type="button" onClick={() => adjust(-step)} className="px-4 text-sm font-black text-slate-700 transition hover:bg-slate-300">−</button>
          <button type="button" onClick={() => adjust(step)} className="border-l border-slate-300 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-300">+</button>
        </div>
      </div>
    </Field>
  );
}

function TextField({ icon: Icon, label, value, onChange, placeholder, type = "text" }) {
  return (
    <Field label={label}>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass()} ${Icon ? "pl-10" : ""}`}
        />
      </div>
    </Field>
  );
}

function NumberField({ label, suffix, value, onChange }) {
  return (
    <Field label={label} suffix={suffix}>
      <input
        value={value}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
        className={inputClass()}
      />
    </Field>
  );
}

function Card({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.9)]">
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <div className="rounded-2xl bg-[#C51605] p-2.5 text-white shadow-lg shadow-[#C51605]/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-6 text-slate-200">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, note, dark = false }) {
  return (
    <div className={`${dark ? "border-zinc-800 bg-zinc-950 text-white" : "border-slate-300 bg-slate-100 text-slate-950"} rounded-[1.4rem] border p-4`}>
      <p className={`${dark ? "text-zinc-300" : "text-slate-700"} text-[11px] font-bold uppercase tracking-[0.16em]`}>{label}</p>
      <p className="mt-2 text-xl font-black tracking-tight">{value}</p>
      {note && <p className={`${dark ? "text-zinc-300" : "text-slate-700"} mt-1 text-xs leading-5`}>{note}</p>}
    </div>
  );
}

function BrandVisual({ title, subtitle, compact = false }) {
  return (
    <div className={`${compact ? "min-h-[150px]" : "min-h-[210px]"} relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.85)]`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(197,22,5,0.42),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.14),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_46%,#151515_100%)]" />
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/15 bg-white/5" />
      <div className="absolute bottom-0 right-0 h-24 w-48 rounded-tl-full bg-[#C51605]/20 blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-200 backdrop-blur">
          AIR DESIGN
        </div>
        <div>
          <p className="text-2xl font-black uppercase tracking-tight text-[#E23120]">{title}</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-200">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function Header({ onReset }) {
  return (
    <header className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/90 px-5 py-4 shadow-[0_20px_70px_-52px_rgba(15,23,42,0.7)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#C51605] font-black text-white shadow-lg shadow-[#C51605]/25">A</div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-950">AIR DESIGN</p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C51605]">Kiến tạo không gian sống hoàn hảo</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
        <a href="#quote-calculator" className="rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-[#C51605] hover:text-[#C51605]">Tính báo giá</a>
        <a href="https://www.facebook.com/airdesignhcm" target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-[#C51605] hover:text-[#C51605]">Fanpage</a>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-white">0901 979 496</span>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-[#C51605] hover:text-[#C51605]">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>
    </header>
  );
}

function LandingHero() {
  return (
    <section className="overflow-hidden rounded-[2.5rem] bg-[#151515] text-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.95)]">
      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="absolute left-[-5%] top-[-20%] h-72 w-72 rounded-full bg-[#C51605]/30 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-8%] h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex max-w-5xl flex-col justify-center gap-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-200 backdrop-blur">
            <Sparkles className="h-4 w-4 text-[#E23120]" /> AIR DESIGN & BUILD
          </div>
          <div>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-tight tracking-tight text-[#E23120] sm:text-5xl lg:text-6xl">
              Công cụ báo giá xây nhà trọn gói nhanh cho gia chủ
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Ước tính chi phí xây nhà theo diện tích, số tầng, ban công, sân thượng và đơn giá thi công. Khách hàng có thể lưu bảng báo giá để xem sau và liên hệ AirDesign để được tư vấn chi tiết.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#quote-calculator" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C51605] px-6 py-3 text-sm font-black uppercase text-white shadow-lg shadow-[#C51605]/25 transition hover:bg-[#A91204]">
              Tính báo giá ngay <ArrowRight className="h-4 w-4" />
            </a>
            <a href="https://zalo.me/0901979496" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black uppercase text-white transition hover:bg-white hover:text-slate-950">
              Tư vấn qua Zalo
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <LandingMetric value="Nhanh" label="Có bảng dự toán sơ bộ" />
            <LandingMetric value="Rõ" label="Từng hạng mục tính giá" />
            <LandingMetric value="Lưu" label="Giữ bảng báo giá để xem sau" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingMetric({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{label}</p>
    </div>
  );
}

function LandingProcess() {
  const steps = [
    "Nhập thông tin công trình",
    "Chọn số tầng, sân thượng và ban công",
    "Điều chỉnh đơn giá phần thô / hoàn thiện",
    "Lưu bảng báo giá và liên hệ AirDesign",
  ];

  return (
    <section className="rounded-[2.25rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.9)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C51605]">Quy trình đơn giản</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-[#E23120]">4 bước để có bảng báo giá sơ bộ</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">Khách không cần chờ nhân viên phản hồi mới có hình dung ban đầu về ngân sách xây nhà.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step} className="rounded-[1.5rem] border border-slate-300 bg-slate-100 p-5 text-slate-950">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#C51605] text-sm font-black text-white">{index + 1}</div>
                <CheckCircle2 className="h-5 w-5 text-[#C51605]" />
              </div>
              <p className="text-sm font-black leading-6">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [input, setInput] = useState(defaultInput);
  const [message, setMessage] = useState("");
  const result = useMemo(() => buildQuote(input), [input]);

  const updateInput = (key, value) => setInput((current) => ({ ...current, [key]: value }));

  const saveLeadPreview = () => {
    if (!input.customerEmail || !input.customerPhone) {
      setMessage("Vui lòng nhập Gmail/email và số điện thoại trước khi lưu lead / xuất PDF.");
      return;
    }
    setMessage("Preview: Lead sẽ được lưu vào trình duyệt, gửi Google Sheet và gửi CRM/Webhook nếu đã cấu hình URL.");
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Header onReset={() => { setInput(defaultInput); setMessage("Đã reset dữ liệu về mặc định."); }} />
        <LandingHero />
        <LandingProcess />

        <section id="quote-calculator" className="overflow-hidden rounded-[2.25rem] bg-slate-950 text-white shadow-[0_35px_100px_-50px_rgba(15,23,42,0.9)]">
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr,0.9fr] lg:p-10">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#C51605]/25 blur-3xl" />
            <div className="relative z-10 flex flex-col justify-between gap-8">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-[#E23120]" /> AIR DESIGN & BUILD
                </div>
                <h1 className="max-w-4xl text-4xl font-black uppercase leading-tight tracking-tight text-[#E23120] sm:text-5xl lg:text-6xl">Công cụ tính báo giá xây nhà trọn gói</h1>
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-[#E23120]">Kiến tạo không gian sống hoàn hảo</p>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Nhập thông tin công trình, chọn quy mô xây dựng và nhận bảng báo giá sơ bộ rõ ràng trong vài giây.</p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                  <Hammer className="h-4 w-4 text-[#E23120]" /> Bắt đầu tính chi phí bên dưới
                </div>
              </div>
            </div>
            <div className="relative z-10 rounded-[2rem] border border-white/15 bg-white p-5 text-slate-950 shadow-2xl lg:p-6">
              <div className="mb-5">
                <BrandVisual compact title="Design & Build" subtitle="Thiết kế, thi công và hoàn thiện tổ ấm theo phong cách hiện đại." />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">Tổng dự toán tạm tính</p>
              <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{formatMoney(result.totalAmount)}</p>
              <div className="mt-5">
                <MiniStat label="Chủ nhà" value={input.ownerName || "—"} note={input.location || "Chưa nhập vị trí"} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-slate-300 bg-slate-100 p-4">
                  <MoneyField label="Đơn giá phần thô" value={input.foundationUnitPrice} onChange={(v) => updateInput("foundationUnitPrice", v)} />
                </div>
                <div className="rounded-[1.4rem] border border-slate-300 bg-slate-100 p-4">
                  <MoneyField label="Giá hoàn thiện" value={input.constructionUnitPrice} onChange={(v) => updateInput("constructionUnitPrice", v)} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {result.errors.length > 0 && (
          <div className="rounded-3xl border border-red-200 bg-red-50/90 p-4 text-sm font-semibold text-red-800">
            {result.errors.join(" ")}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-2">
          <Card title="1. Thông tin công trình" subtitle="Thông tin khách hàng và khu đất cần báo giá." icon={UserRound}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField icon={UserRound} label="Tên chủ nhà" value={input.ownerName} onChange={(v) => updateInput("ownerName", v)} />
              <TextField icon={Mail} label="Gmail nhận báo giá" type="email" value={input.customerEmail} onChange={(v) => updateInput("customerEmail", v)} />
              <TextField icon={Phone} label="Số điện thoại" type="tel" value={input.customerPhone} onChange={(v) => updateInput("customerPhone", v)} placeholder="0901234567" />
              <TextField icon={MapPin} label="Vị trí xây dựng" value={input.location} onChange={(v) => updateInput("location", v)} />
              <NumberField label="Tổng diện tích lô đất" suffix="m²" value={input.landArea} onChange={(v) => updateInput("landArea", v)} />
              <NumberField label="Bề ngang công trình" suffix="m" value={input.frontWidth} onChange={(v) => updateInput("frontWidth", v)} />
            </div>
          </Card>

          <Card title="2. Quy mô xây dựng" subtitle="Tự động quy đổi theo tầng, ban công, tầng thượng và mái." icon={Calculator}>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Diện tích xây dựng" suffix="m²" value={input.constructionArea} onChange={(v) => updateInput("constructionArea", v)} />
              <NumberField label="Số tầng" suffix="tầng" value={input.floors} onChange={(v) => updateInput("floors", v)} />
              {result.canChooseLayout ? (
                <Field label="Quy mô xây dựng">
                  <select value={input.layoutMode} onChange={(e) => updateInput("layoutMode", e.target.value)} className={inputClass()}>
                    <option value="without_rooftop">{`1 trệt ${Math.max(1, result.floors - 1)} lầu`}</option>
                    <option value="with_rooftop">{`1 trệt ${Math.max(1, result.floors - 2)} lầu 1 tầng thượng`}</option>
                  </select>
                </Field>
              ) : (
                <MiniStat label="Quy mô" value={result.layoutLabel} />
              )}
              <NumberField label="Độ rộng ban công" suffix="m" value={input.balconyDepth} onChange={(v) => updateInput("balconyDepth", v)} />
              {result.hasRooftop && <NumberField label="Phần trong nhà tầng thượng" suffix="m²" value={input.rooftopIndoorArea} onChange={(v) => updateInput("rooftopIndoorArea", v)} />}
            </div>
          </Card>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.9)]">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C51605]">Hình ảnh thương hiệu</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">AirDesign & Build</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Không gian hình ảnh thương hiệu có thể thay bằng ảnh công trình, ảnh đội ngũ, phối cảnh 3D hoặc logo thật của AirDesign.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <BrandVisual compact title="Thiết kế" subtitle="Tối ưu công năng, thẩm mỹ và trải nghiệm sống." />
            <BrandVisual compact title="Thi công" subtitle="Quy trình rõ ràng, kiểm soát chất lượng từng hạng mục." />
            <BrandVisual compact title="Hoàn thiện" subtitle="Đồng bộ vật tư, ngân sách và tiến độ thực tế." />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.9)]">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C51605]">Bảng khối lượng & dự toán</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Chi tiết báo giá tạm tính</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Bảng này dùng để tham khảo nhanh. Giá chính thức cần khảo sát thực tế, bản vẽ thiết kế, vật tư và điều kiện thi công.</p>
            </div>
            <div className="rounded-[1.4rem] bg-slate-950 px-5 py-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">Tổng cộng</p>
              <p className="mt-1 text-2xl font-black">{formatMoney(result.totalAmount)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-300 bg-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-[#151515] text-[11px] uppercase tracking-[0.14em] text-white">
                  <tr>{quoteHeaders.map((h) => <th key={h} className="px-4 py-4 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.map((row) => (
                    <tr key={`${row.order}-${row.item}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-bold text-slate-700">{row.order}</td>
                      <td className="px-4 py-4 font-bold text-slate-900">{row.item}</td>
                      <td className="px-4 py-4 text-slate-700">{row.physicalArea === null ? "Theo thực tế" : formatArea(row.physicalArea)}</td>
                      <td className="px-4 py-4 text-slate-700">{row.coefficient === null ? "—" : row.coefficient}</td>
                      <td className="px-4 py-4 text-slate-700">{formatMoney(row.unitPrice)}</td>
                      <td className="px-4 py-4 font-black text-slate-950">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#151515] text-white">
                    <td className="px-4 py-4 font-black" colSpan={2}>Tổng cộng</td>
                    <td className="px-4 py-4 font-bold">{formatArea(result.totalBillableArea)}</td>
                    <td className="px-4 py-4">—</td>
                    <td className="px-4 py-4">—</td>
                    <td className="px-4 py-4 text-lg font-black">{formatMoney(result.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.9)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#E23120] sm:text-3xl">Nhận báo giá xây nhà trọn gói ngay</h2>
            <button type="button" onClick={saveLeadPreview} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C51605] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#C51605]/25 transition hover:bg-[#A91204]">
              <Download className="h-4 w-4" /> Lưu bảng báo giá để xem sau
            </button>
          </div>
          {message && <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p>}
        </section>

        <section className="overflow-hidden rounded-[2.25rem] bg-[#151515] p-6 text-white shadow-[0_35px_100px_-60px_rgba(15,23,42,0.9)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr,0.75fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#E23120]">Air Design</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-[#E23120] sm:text-4xl">LIÊN HỆ AIRDESIGN ĐỂ NHẬN TƯ VẤN BÁO GIÁ XÂY NHÀ TRỌN GÓI</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Xây dựng tổ ấm mơ ước bằng sự Tận Tâm, Sáng Tạo và Chuyên Nghiệp.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="https://www.youtube.com/@AIRDESIGN-HCM" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950">YouTube</a>
                <a href="https://www.facebook.com/airdesignhcm" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950">Fanpage</a>
                <a href="https://zalo.me/0901979496" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950">Zalo</a>
                <a href="https://www.tiktok.com/@airdesignvn" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950">TikTok</a>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#C51605]"><Home className="h-5 w-5" /></div>
                <div><p className="font-black">Hotline tư vấn</p><p className="text-sm text-slate-300">0901 979 496</p></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
