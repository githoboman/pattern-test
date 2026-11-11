"use client";

import React, { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiSparkling2Line,
  RiCheckboxCircleLine,
  RiRuler2Line,
  RiScissors2Line,
  RiStackLine,
  RiDownload2Line,
  RiRefreshLine,
  RiFileTextLine,
  RiQuestionLine,
  RiCheckLine,
  RiEqualizerLine,
  RiSendPlaneLine,
  RiLockLine,
  RiPrinterLine,
  RiFileCodeLine,
  RiCheckboxLine,
  RiCheckboxBlankLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiFullscreenLine,
  RiHistoryLine,
  RiInformationLine,
  RiCodeSSlashLine,
  RiCompasses2Line,
  RiUploadCloud2Line,
  RiCloseLine,
  RiDeleteBin6Line,
  RiLightbulbLine,
  RiFileDownloadLine,
  RiCrosshair2Line
} from "react-icons/ri";

interface ObservedValue {
  value: string | null;
  status: "observed" | "needs_confirmation";
}

interface AnalysisData {
  garment_type: ObservedValue;
  silhouette: ObservedValue;
  neckline: ObservedValue;
  sleeves: ObservedValue;
  length: ObservedValue;
  closure: ObservedValue;
  fabric: ObservedValue;
  back_view_available: boolean;
  customer_instructions: string[];
}

interface MeasurementRow {
  label: string;
  fieldKey: "bust" | "waist" | "hip" | "length";
  body: number;
  rule_id: string;
  ease: number;
  garment: number;
  status: string;
}

interface TailorCorrection {
  field: string;
  oldVal: string;
  newVal: string;
  cause: string;
  notes?: string;
  timestamp: string;
  version: number;
}

// Standard Sizing Standards (UK / US / EU Metric Blocks)
const SIZE_PRESETS = {
  "UK 8": { bust: 84, waist: 66, hip: 90, length: 102, label: "UK 8 / US 4 (XS/S)" },
  "UK 10": { bust: 88, waist: 70, hip: 94, length: 104, label: "UK 10 / US 6 (S/M)" },
  "UK 12": { bust: 92, waist: 74, hip: 98, length: 105, label: "UK 12 / US 8 (Standard M)" },
  "UK 14": { bust: 96, waist: 78, hip: 102, length: 106, label: "UK 14 / US 10 (L)" },
  "UK 16": { bust: 102, waist: 84, hip: 108, length: 107, label: "UK 16 / US 12 (XL)" }
};

type SizePresetKey = keyof typeof SIZE_PRESETS | "Custom";

// Shared Astra Gray UI Tokens & Pill Button Hierarchy (Figma node 1:12 & 1:29)
const PRIMARY_PILL_BTN =
  "rounded-full bg-[#1E1E1E] hover:bg-[#333333] text-white font-[ClashGrotesk-medium] font-medium shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer disabled:opacity-60";
const SECONDARY_PILL_BTN =
  "rounded-full bg-white hover:bg-[#F5F5F5] border border-[#D0D5DD] hover:border-[#BDBDBD] text-[#4F4F4F] hover:text-[#1E1E1E] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-2xs";
const HIGHLIGHT_LINK_BTN =
  "inline-flex items-center gap-1.5 text-xs font-medium text-[#4285f4] hover:text-[#2b6cb0] underline underline-offset-4 transition-colors cursor-pointer shrink-0";
const OPTION_ACTIVE =
  "bg-[#F2F2F2] text-[#1E1E1E] border border-[#757575] ring-1 ring-[#BDBDBD]/60 shadow-2xs";
const OPTION_IDLE =
  "bg-white text-[#4F4F4F] border border-[#E0E0E0] hover:border-[#BDBDBD] hover:bg-[#FAFAFA] hover:text-[#1E1E1E]";

// Fluid Framer Motion choreography presets
const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;
const TACTILE_SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 } as const;
const MODAL_SPRING = { type: "spring", stiffness: 360, damping: 30, mass: 0.85 } as const;

export default function TailorPackStudio() {
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const p = new URLSearchParams(window.location.search);
        const stepParam = p.get("step");
        if (stepParam) {
          const num = parseInt(stepParam, 10);
          if (num >= 1 && num <= 3) return num;
        }
        if (p.get("from") === "design" || (p.get("image") && p.get("image") !== "/design_placeholder_1.png")) {
          return 2;
        }
      } catch {}
    }
    return 3; // Default to Step 3 so founders and tailors immediately land on the full interactive blueprint!
  });
  const [blueprintTab, setBlueprintTab] = useState<"flats" | "measurements" | "assembly" | "history">("flats");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialSlide, setTutorialSlide] = useState(0);
  const [questionnaireTab, setQuestionnaireTab] = useState<"womenswear" | "menswear" | "pitch">("womenswear");
  const [versionNumber, setVersionNumber] = useState(1);
  const [versionStatus, setVersionStatus] = useState<"Draft" | "Approved for Sampling">("Draft");
  const [approvedTimestamp, setApprovedTimestamp] = useState<string | null>(null);

  // Incoming handover from AI Agent
  const [isFromDesign, setIsFromDesign] = useState<boolean>(false);

  // SVG and drawing controls
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgZoom, setSvgZoom] = useState<number>(1);
  const [showCallouts, setShowCallouts] = useState<boolean>(true);
  const [showDarts, setShowDarts] = useState<boolean>(true);
  const [inspectedLayer, setInspectedLayer] = useState<"all" | "silhouette" | "seams" | "zipper" | "darts" | "hem">("all");

  // Toast feedback
  const [toast, setToast] = useState<{ title: string; desc: string; type?: "success" | "info" } | null>(null);

  const triggerToast = (title: string, desc: string, type: "success" | "info" = "success") => {
    setToast({ title, desc, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Form states
  const [customerNotes, setCustomerNotes] = useState(
    "Client requests a modest square neckline, natural breathable cotton, and clean invisible closure."
  );
  const [selectedSample, setSelectedSample] = useState("/design_placeholder_1.png");

  // Garment Upload States & Handlers
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const step1FileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [detectedColorHex, setDetectedColorHex] = useState<string>("#27272A");
  const [detectionConfidence, setDetectionConfidence] = useState<number>(96);
  const [detectionSignals, setDetectionSignals] = useState<string[]>([
    "Fitted bodice contour",
    "Square neckline geometry",
    "Sleeveless armscye",
    "55cm center-back invisible zipper"
  ]);

  const processUploadedFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      triggerToast("Invalid File", "Please upload a valid image (PNG, JPG, WEBP, or SVG).", "info");
      return;
    }
    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedSample(result);
        setUploadedFileName(file.name);
        setUploadedFileSize(sizeStr);
        setIsFromDesign(true);
        try {
          sessionStorage.setItem("astra_pattern_image", result);
          sessionStorage.setItem("astra_pattern_filename", file.name);
          sessionStorage.setItem("astra_pattern_filesize", sizeStr);
        } catch {}
        // Automatically run multi-signal cloth & fastening detection on the uploaded image
        runVisualClothDetection(result, file.name, customerNotes, false);
        setShowUploadModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleClearUpload = () => {
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setSelectedSample("/design_placeholder_1.png");
    handleGarmentBlockChange("Sheath Dress");
    try {
      sessionStorage.removeItem("astra_pattern_image");
      sessionStorage.removeItem("astra_pattern_filename");
      sessionStorage.removeItem("astra_pattern_filesize");
    } catch {}
    triggerToast("Upload Cleared", "Reset to benchmark garment reference.", "info");
  };

  // Size Presets & Cuts
  const [selectedSize, setSelectedSize] = useState<SizePresetKey>("UK 12");
  const [bodyBust, setBodyBust] = useState(92);
  const [bodyWaist, setBodyWaist] = useState(74);
  const [bodyHip, setBodyHip] = useState(98);
  const [bodyLength, setBodyLength] = useState(105);

  // Unit Toggle (Centimeters vs Inches)
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const fmtVal = (cmVal: number, decimals = 1) =>
    unit === "cm" ? cmVal.toFixed(decimals) : (cmVal / 2.54).toFixed(decimals);
  const fmtUnit = (cmVal: number, decimals = 1) => `${fmtVal(cmVal, decimals)} ${unit}`;

  // Outfit Block, Cut, Neckline, Sleeve & Fastening/Closure choices
  const [garmentBlock, setGarmentBlock] = useState<
    "Sheath Dress" | "A-Line Dress" | "Slip Dress" | "Tailored Blazer" | "Button-Down Shirt" | "Kaftan / Boubou"
  >("Sheath Dress");
  const [hemCut, setHemCut] = useState<"Midi" | "Mini" | "Maxi">("Midi");
  const [necklineCut, setNecklineCut] = useState<"Square" | "Round" | "V-Neck" | "Sweetheart">("Square");
  const [sleeveCut, setSleeveCut] = useState<"Sleeveless" | "Short" | "Long">("Sleeveless");
  const [silhouetteFit, setSilhouetteFit] = useState<"Fitted" | "Semi-Fitted" | "Relaxed">("Fitted");
  const [fabricChoice, setFabricChoice] = useState("100% Woven Cotton Poplin (Non-stretch)");
  const [closureChoice, setClosureChoice] = useState("Back Invisible Zipper (55cm)");

  // Pure Deterministic Wearing Ease State (calibratable by tailors)
  const [easeValues, setEaseValues] = useState({
    bust: 4.0,   // FreeSewing v3 fitted chestEase
    waist: 3.0,  // FreeSewing v3 / Aldrich fitted waistEase
    hip: 4.5,    // FreeSewing v3 / Aldrich fitted hipsEase
    length: 0.0  // Aldrich finished dress hemline baseline
  });

  // Live Fabric Yardage Calculator (60" / 150cm wide vs 45" / 115cm wide rolls)
  const fabricYardage = (() => {
    const finLen = bodyLength + easeValues.length;
    const finHipVal = bodyHip + easeValues.hip;
    const baseDressMeters = (finLen + 18) / 100; // Garment length + 18cm hem/allowance buffer
    const sleeveMeters = sleeveCut === "Long" ? 0.65 : sleeveCut === "Short" ? 0.35 : 0;
    const blockMultiplier = garmentBlock === "Kaftan / Boubou" ? 0.45 : garmentBlock === "A-Line Dress" ? 0.25 : 0;
    const sizeWidthFactor = finHipVal > 106 ? 0.25 : 0;
    const meters60 = Number((baseDressMeters + sleeveMeters + blockMultiplier + sizeWidthFactor).toFixed(1));
    const yards60 = Number((meters60 * 1.09361).toFixed(1));
    const meters45 = Number((meters60 * 1.35).toFixed(1));
    const yards45 = Number((meters45 * 1.09361).toFixed(1));
    return { meters60, yards60, meters45, yards45 };
  })();

  // Apply standard size preset
  const handleSelectSizePreset = (sizeKey: SizePresetKey) => {
    setSelectedSize(sizeKey);
    if (sizeKey !== "Custom") {
      const p = SIZE_PRESETS[sizeKey];
      setBodyBust(p.bust);
      setBodyWaist(p.waist);
      setBodyHip(p.hip);
      let len = p.length;
      if (garmentBlock === "Tailored Blazer") len = 68;
      else if (garmentBlock === "Button-Down Shirt") len = 65;
      else if (garmentBlock === "Kaftan / Boubou") len = 142;
      else if (hemCut === "Mini") len = 85;
      else if (hemCut === "Maxi") len = 140;
      setBodyLength(len);
      triggerToast(
        `Size Applied: ${sizeKey}`,
        `Bust: ${fmtUnit(p.bust, 0)} | Waist: ${fmtUnit(p.waist, 0)} | Hip: ${fmtUnit(p.hip, 0)}`
      );
    }
  };

  // Apply hemline cut
  const handleHemCutChange = (cut: "Midi" | "Mini" | "Maxi") => {
    setHemCut(cut);
    const nextLen =
      garmentBlock === "Tailored Blazer"
        ? cut === "Mini"
          ? 62
          : cut === "Maxi"
          ? 78
          : 68
        : garmentBlock === "Button-Down Shirt"
        ? cut === "Mini"
          ? 58
          : cut === "Maxi"
          ? 74
          : 65
        : cut === "Mini"
        ? 85
        : cut === "Maxi"
        ? 140
        : 105;
    setBodyLength(nextLen);
    setAnalysis((prev) => ({ ...prev, length: { value: `${cut.toLowerCase()} (${nextLen}cm)`, status: "observed" } }));
  };

  // Apply neckline cut
  const handleNecklineChange = (neck: "Square" | "Round" | "V-Neck" | "Sweetheart") => {
    setNecklineCut(neck);
    setAnalysis((prev) => ({ ...prev, neckline: { value: neck.toLowerCase(), status: "observed" } }));
  };

  // Apply sleeve cut
  const handleSleeveChange = (slv: "Sleeveless" | "Short" | "Long") => {
    setSleeveCut(slv);
    setAnalysis((prev) => ({ ...prev, sleeves: { value: slv.toLowerCase(), status: "observed" } }));
  };

  // Apply closure / fastening change
  const handleClosureChange = (closure: string) => {
    setClosureChoice(closure);
    setAnalysis((prev) => ({ ...prev, closure: { value: closure.toLowerCase(), status: "observed" } }));
  };

  // Apply garment block preset (6 full outfit blocks with realistic closures — not all clothes use zippers!)
  const handleGarmentBlockChange = (
    block: "Sheath Dress" | "A-Line Dress" | "Slip Dress" | "Tailored Blazer" | "Button-Down Shirt" | "Kaftan / Boubou"
  ) => {
    setGarmentBlock(block);
    if (block === "Sheath Dress") {
      setNecklineCut("Square");
      setSleeveCut("Sleeveless");
      setHemCut("Midi");
      setSilhouetteFit("Fitted");
      setEaseValues({ bust: 4.0, waist: 3.0, hip: 4.5, length: 0.0 });
      setBodyLength(105);
      setClosureChoice("Back Invisible Zipper (55cm)");
      setFabricChoice("100% Woven Cotton Poplin (Non-stretch)");
      setDetectionSignals([
        "Contoured darted bodice",
        "Square neckline cut",
        "Sleeveless armhole facing",
        "55cm center-back invisible zipper"
      ]);
      setAnalysis((prev) => ({
        ...prev,
        garment_type: { value: "sheath dress", status: "observed" },
        silhouette: { value: "fitted", status: "observed" },
        neckline: { value: "square", status: "observed" },
        sleeves: { value: "sleeveless", status: "observed" },
        length: { value: "midi (105cm)", status: "observed" },
        closure: { value: "back invisible zipper (55cm)", status: "observed" },
        fabric: { value: "woven cotton poplin", status: "observed" }
      }));
    } else if (block === "A-Line Dress") {
      setNecklineCut("Round");
      setSleeveCut("Short");
      setHemCut("Midi");
      setSilhouetteFit("Semi-Fitted");
      setEaseValues({ bust: 5.5, waist: 4.5, hip: 7.0, length: 0.0 });
      setBodyLength(112);
      setClosureChoice("Back Invisible Zipper (55cm)");
      setFabricChoice("Linen Blend (Low stretch)");
      setDetectionSignals([
        "Fitted upper bodice + flared skirt",
        "Round scoop neckline",
        "Short set-in sleeves",
        "55cm center-back invisible zipper"
      ]);
      setAnalysis((prev) => ({
        ...prev,
        garment_type: { value: "a-line flared dress", status: "observed" },
        silhouette: { value: "a-line flare", status: "observed" },
        neckline: { value: "round", status: "observed" },
        sleeves: { value: "short", status: "observed" },
        length: { value: "midi (112cm)", status: "observed" },
        closure: { value: "back invisible zipper (55cm)", status: "observed" },
        fabric: { value: "linen blend", status: "observed" }
      }));
    } else if (block === "Slip Dress") {
      setNecklineCut("Sweetheart");
      setSleeveCut("Sleeveless");
      setHemCut("Maxi");
      setSilhouetteFit("Semi-Fitted");
      setEaseValues({ bust: 4.5, waist: 5.0, hip: 5.5, length: 0.0 });
      setBodyLength(130);
      setClosureChoice("Side Invisible Zipper (35cm)");
      setFabricChoice("Silk Crepe de Chine (Fluid)");
      setDetectionSignals([
        "45° bias-cut fluid drape",
        "Sweetheart camisole & spaghetti straps",
        "Clean back on fold (no back zipper)",
        "35cm left side-seam invisible zipper"
      ]);
      setAnalysis((prev) => ({
        ...prev,
        garment_type: { value: "bias slip dress", status: "observed" },
        silhouette: { value: "bias drape", status: "observed" },
        neckline: { value: "sweetheart camisole", status: "observed" },
        sleeves: { value: "spaghetti straps", status: "observed" },
        length: { value: "maxi (130cm)", status: "observed" },
        closure: { value: "side invisible zipper (35cm)", status: "observed" },
        fabric: { value: "silk crepe de chine", status: "observed" }
      }));
    } else if (block === "Tailored Blazer") {
      setNecklineCut("V-Neck");
      setSleeveCut("Long");
      setHemCut("Mini");
      setSilhouetteFit("Semi-Fitted");
      setEaseValues({ bust: 7.0, waist: 6.0, hip: 6.5, length: 0.0 });
      setBodyLength(68);
      setClosureChoice("Front Button Placket");
      setFabricChoice("Wool Crepe (Tailored)");
      setDetectionSignals([
        "Structured shoulder & notched lapel",
        "Front button placket (no zipper)",
        "Hip welt pockets & back vent",
        "Long tailored sleeve block"
      ]);
      setAnalysis((prev) => ({
        ...prev,
        garment_type: { value: "tailored blazer jacket", status: "observed" },
        silhouette: { value: "structured tailored", status: "observed" },
        neckline: { value: "notched lapel v-neck", status: "observed" },
        sleeves: { value: "long two-piece sleeve", status: "observed" },
        length: { value: "hip length (68cm)", status: "observed" },
        closure: { value: "front button placket (no zipper)", status: "observed" },
        fabric: { value: "wool crepe", status: "observed" }
      }));
    } else if (block === "Button-Down Shirt") {
      setNecklineCut("V-Neck");
      setSleeveCut("Long");
      setHemCut("Mini");
      setSilhouetteFit("Semi-Fitted");
      setEaseValues({ bust: 6.5, waist: 6.0, hip: 6.0, length: 0.0 });
      setBodyLength(65);
      setClosureChoice("Front Button Placket");
      setFabricChoice("100% Woven Cotton Poplin (Non-stretch)");
      setDetectionSignals([
        "Collared neckline & back shoulder yoke",
        "Center-front 5-button placket (no zipper)",
        "Curved shirt-tail hem & chest pocket",
        "Set-in shirt sleeve with cuff"
      ]);
      setAnalysis((prev) => ({
        ...prev,
        garment_type: { value: "button-down shirt / top", status: "observed" },
        silhouette: { value: "semi-fitted shirt", status: "observed" },
        neckline: { value: "collared v-neck", status: "observed" },
        sleeves: { value: "long cuffed sleeve", status: "observed" },
        length: { value: "hip length (65cm)", status: "observed" },
        closure: { value: "front button placket (no zipper)", status: "observed" },
        fabric: { value: "woven cotton poplin", status: "observed" }
      }));
    } else if (block === "Kaftan / Boubou") {
      setNecklineCut("V-Neck");
      setSleeveCut("Short");
      setHemCut("Maxi");
      setSilhouetteFit("Relaxed");
      setEaseValues({ bust: 12.0, waist: 14.0, hip: 12.0, length: 0.0 });
      setBodyLength(142);
      setClosureChoice("Pullover / Slip-On (No Zipper)");
      setFabricChoice("Ankara Wax Print / Silk Damask");
      setDetectionSignals([
        "Wide flowing kimono / boubou drape",
        "Pullover slip-on cut on fold (no zipper)",
        "No waist suppression darts needed",
        "Maxi ankle length (142cm)"
      ]);
      setAnalysis((prev) => ({
        ...prev,
        garment_type: { value: "kaftan / boubou gown", status: "observed" },
        silhouette: { value: "relaxed flowing drape", status: "observed" },
        neckline: { value: "v-neck pullover", status: "observed" },
        sleeves: { value: "wide kimono short sleeve", status: "observed" },
        length: { value: "maxi (142cm)", status: "observed" },
        closure: { value: "pullover / slip-on (no zipper)", status: "observed" },
        fabric: { value: "ankara wax print / damask", status: "observed" }
      }));
    }
  };

  // Apply sample style preset (updates photo + block + neckline + sleeves + length + closure)
  const handleSelectSampleStyle = (
    id: string,
    label: string,
    explicitBlock?: "Sheath Dress" | "A-Line Dress" | "Slip Dress" | "Tailored Blazer" | "Button-Down Shirt" | "Kaftan / Boubou"
  ) => {
    setSelectedSample(id);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    if (explicitBlock) {
      handleGarmentBlockChange(explicitBlock);
    } else if (id.includes("placeholder_1")) {
      handleGarmentBlockChange("Sheath Dress");
    } else if (id.includes("placeholder_2")) {
      handleGarmentBlockChange("A-Line Dress");
    } else if (id.includes("placeholder_4")) {
      handleGarmentBlockChange("Slip Dress");
    } else if (id.includes("jacket")) {
      handleGarmentBlockChange("Tailored Blazer");
    } else if (id.includes("placeholder_3")) {
      handleGarmentBlockChange("Button-Down Shirt");
    } else {
      handleGarmentBlockChange("Kaftan / Boubou");
    }
    triggerToast("Style Selected", `${label} loaded with matching pattern block and fastening.`);
  };

  // Apply silhouette fit cut
  const handleSilhouetteFitChange = (fit: "Fitted" | "Semi-Fitted" | "Relaxed") => {
    setSilhouetteFit(fit);
    if (fit === "Fitted") {
      setEaseValues({ bust: 4.0, waist: 3.0, hip: 4.5, length: 0.0 });
    } else if (fit === "Semi-Fitted") {
      setEaseValues({ bust: 6.0, waist: 5.0, hip: 6.0, length: 0.0 });
    } else if (fit === "Relaxed") {
      setEaseValues({ bust: 8.0, waist: 7.0, hip: 8.0, length: 0.0 });
    }
  };

  // Assembly steps interactive checklist
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Correction Log
  const [corrections, setCorrections] = useState<TailorCorrection[]>([]);
  const [corrField, setCorrField] = useState("bust_ease");
  const [corrOld, setCorrOld] = useState("+4.0 cm");
  const [corrNew, setCorrNew] = useState("+4.5 cm");
  const [corrCause, setCorrCause] = useState("Fit Adjustment");
  const [corrNotes, setCorrNotes] = useState("Slightly more breathing room across the bust.");

  // Analysis result
  const [analysis, setAnalysis] = useState<AnalysisData>({
    garment_type: { value: "dress", status: "observed" },
    silhouette: { value: "fitted", status: "observed" },
    neckline: { value: "square", status: "observed" },
    sleeves: { value: "sleeveless", status: "observed" },
    length: { value: "midi", status: "observed" },
    closure: { value: null, status: "needs_confirmation" },
    fabric: { value: null, status: "needs_confirmation" },
    back_view_available: false,
    customer_instructions: []
  });

  // Check incoming design handover on mount (scheduled async to avoid sync effect setState)
  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const imgParam = params.get("image");
        const fromParam = params.get("from");
        const titleParam = params.get("title");
        const notesParam = params.get("notes");

        if (imgParam && imgParam !== "session") {
          setSelectedSample(imgParam);
          if (titleParam) setUploadedFileName(titleParam);
        } else if (imgParam === "session") {
          const stored = sessionStorage.getItem("astra_pattern_image");
          if (stored) setSelectedSample(stored);
        }

        // Check stored custom upload session
        const storedUpload = sessionStorage.getItem("astra_pattern_image");
        const storedName = sessionStorage.getItem("astra_pattern_filename");
        const storedSize = sessionStorage.getItem("astra_pattern_filesize");
        if (storedUpload && !imgParam) {
          setSelectedSample(storedUpload);
          if (storedName) setUploadedFileName(storedName);
          if (storedSize) setUploadedFileSize(storedSize);
        }

        const storedNotes = notesParam || sessionStorage.getItem("astra_pattern_notes");
        if (storedNotes) {
          setCustomerNotes(storedNotes);
        }

        // If routed directly from a Maker job or design, land on Step 2 for size & cut selection
        if (fromParam === "maker" || fromParam === "design" || (imgParam && imgParam !== "/design_placeholder_1.png")) {
          setIsFromDesign(true);
          setCurrentStep(2);
          triggerToast(
            titleParam ? `Job Loaded: ${titleParam}` : "Outfit Loaded",
            "Choose a size and fit below to generate your pattern sheet."
          );
        }

        // Show interactive onboarding tutorial pop-up on first visit in session
        const seenTutorial = sessionStorage.getItem("astra_pattern_tutorial_seen");
        if (!seenTutorial) {
          setShowTutorialModal(true);
        }
      } catch {}

      const configuredApi = process.env.NEXT_PUBLIC_PATTERN_API_URL?.replace(/\/$/, "");
      if (configuredApi) {
        fetch(`${configuredApi}/health`).catch(() => {});
      }
    }, 0);

    return () => window.clearTimeout(initTimer);
  }, []);

  const handleCloseTutorial = () => {
    try {
      sessionStorage.setItem("astra_pattern_tutorial_seen", "true");
    } catch {}
    setShowTutorialModal(false);
  };

  // Sync correction field default old value when field selection changes
  const handleFieldChange = (field: string) => {
    setCorrField(field);
    if (field === "bust_ease") {
      setCorrOld(`+${easeValues.bust.toFixed(1)} cm`);
      setCorrNew(`+${(easeValues.bust + 0.5).toFixed(1)} cm`);
      setCorrCause("Fit Adjustment");
    } else if (field === "waist_ease") {
      setCorrOld(`+${easeValues.waist.toFixed(1)} cm`);
      setCorrNew(`+${(easeValues.waist + 0.5).toFixed(1)} cm`);
      setCorrCause("Fit Adjustment");
    } else if (field === "hip_ease") {
      setCorrOld(`+${easeValues.hip.toFixed(1)} cm`);
      setCorrNew(`+${(easeValues.hip + 0.5).toFixed(1)} cm`);
      setCorrCause("Fit Adjustment");
    } else if (field === "length") {
      setCorrOld(`${bodyLength} cm`);
      setCorrNew(`${bodyLength + 5} cm`);
      setCorrCause("Tailor Preference");
    } else if (field === "neckline") {
      setCorrOld(analysis.neckline.value || "square");
      setCorrNew("sweetheart");
      setCorrCause("Style Match");
    } else if (field === "closure") {
      setCorrOld(closureChoice);
      setCorrNew("Side Invisible Zipper (35cm)");
      setCorrCause("Tailor Preference");
    } else if (field === "fabric") {
      setCorrOld(fabricChoice);
      setCorrNew("Linen Blend (Low stretch)");
      setCorrCause("Client Request");
    }
  };

  // Multi-Signal Cloth & Fastening Detection Engine (Offscreen HTML5 Canvas Silhouette + Text Signals)
  const runVisualClothDetection = async (
    imgSrc: string,
    fileNameHint: string | null,
    notesHint: string,
    advanceToStep2 = false
  ) => {
    const combinedHint = `${imgSrc.startsWith("data:") ? "" : imgSrc} ${fileNameHint || ""} ${notesHint}`.toLowerCase();

    // 1. Inspect image pixels via Offscreen HTML5 Canvas for silhouette width profile, center placket contrast & dominant color
    let flareRatio = 1.05;
    let waistPinchRatio = 0.85;
    let verticalSpanRatio = 0.78;
    let centerPlacketScore = 0;
    let shoulderSpreadRatio = 1.0;
    let hexColor = "#27272A";

    try {
      const pixelStats = await new Promise<{
        flareRatio: number;
        waistPinchRatio: number;
        verticalSpanRatio: number;
        centerPlacketScore: number;
        shoulderSpreadRatio: number;
        hexColor: string;
      }>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const W = 64;
            const H = 80;
            const canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve({ flareRatio: 1.05, waistPinchRatio: 0.85, verticalSpanRatio: 0.78, centerPlacketScore: 0, shoulderSpreadRatio: 1.0, hexColor: "#27272A" });
              return;
            }
            ctx.drawImage(img, 0, 0, W, H);
            const data = ctx.getImageData(0, 0, W, H).data;

            // Sample corner background RGB
            const corners = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + (W - 1)) * 4];
            let bgR = 0, bgG = 0, bgB = 0;
            for (const c of corners) {
              bgR += data[c];
              bgG += data[c + 1];
              bgB += data[c + 2];
            }
            bgR /= 4; bgG /= 4; bgB /= 4;

            const isFg = (x: number, y: number) => {
              const idx = (y * W + x) * 4;
              const a = data[idx + 3];
              if (a < 40) return false;
              const dr = data[idx] - bgR;
              const dg = data[idx + 1] - bgG;
              const db = data[idx + 2] - bgB;
              return Math.sqrt(dr * dr + dg * dg + db * db) > 26;
            };

            const rowWidth = (yStart: number, yEnd: number) => {
              let sumW = 0;
              let count = 0;
              for (let y = yStart; y <= yEnd; y++) {
                let left = W, right = 0;
                for (let x = 2; x < W - 2; x++) {
                  if (isFg(x, y)) {
                    if (x < left) left = x;
                    if (x > right) right = x;
                  }
                }
                if (right > left) {
                  sumW += right - left;
                  count++;
                }
              }
              return count > 0 ? sumW / count : 24;
            };

            let minY = H, maxY = 0;
            for (let y = 2; y < H - 2; y++) {
              for (let x = 6; x < W - 6; x++) {
                if (isFg(x, y)) {
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            const upperW = rowWidth(16, 26);
            const waistW = rowWidth(34, 44);
            const lowerW = rowWidth(52, 68);

            // Center-front vertical placket/button line contrast (checks horizontal gradient across x = 29..35)
            let placketDiff = 0;
            for (let y = 20; y <= 50; y++) {
              const iLeft = (y * W + 30) * 4;
              const iCenter = (y * W + 32) * 4;
              const iRight = (y * W + 34) * 4;
              placketDiff +=
                Math.abs(data[iCenter] - data[iLeft]) +
                Math.abs(data[iCenter] - data[iRight]);
            }
            const normPlacket = placketDiff / 31;

            // Dominant garment color from center bodice
            let rSum = 0, gSum = 0, bSum = 0, cCount = 0;
            for (let y = 24; y <= 46; y++) {
              for (let x = 22; x <= 42; x++) {
                if (isFg(x, y)) {
                  const idx = (y * W + x) * 4;
                  rSum += data[idx];
                  gSum += data[idx + 1];
                  bSum += data[idx + 2];
                  cCount++;
                }
              }
            }
            let domHex = "#27272A";
            if (cCount > 0) {
              const rHex = Math.round(rSum / cCount).toString(16).padStart(2, "0");
              const gHex = Math.round(gSum / cCount).toString(16).padStart(2, "0");
              const bHex = Math.round(bSum / cCount).toString(16).padStart(2, "0");
              domHex = `#${rHex}${gHex}${bHex}`.toUpperCase();
            }

            resolve({
              flareRatio: lowerW / Math.max(12, waistW),
              waistPinchRatio: waistW / Math.max(12, upperW),
              verticalSpanRatio: Math.max(0.4, (maxY - minY) / H),
              centerPlacketScore: normPlacket,
              shoulderSpreadRatio: upperW / Math.max(12, waistW),
              hexColor: domHex
            });
          } catch {
            resolve({ flareRatio: 1.05, waistPinchRatio: 0.85, verticalSpanRatio: 0.78, centerPlacketScore: 0, shoulderSpreadRatio: 1.0, hexColor: "#27272A" });
          }
        };
        img.onerror = () => {
          resolve({ flareRatio: 1.05, waistPinchRatio: 0.85, verticalSpanRatio: 0.78, centerPlacketScore: 0, shoulderSpreadRatio: 1.0, hexColor: "#27272A" });
        };
        img.src = imgSrc;
      });

      flareRatio = pixelStats.flareRatio;
      waistPinchRatio = pixelStats.waistPinchRatio;
      verticalSpanRatio = pixelStats.verticalSpanRatio;
      centerPlacketScore = pixelStats.centerPlacketScore;
      shoulderSpreadRatio = pixelStats.shoulderSpreadRatio;
      hexColor = pixelStats.hexColor;
      setDetectedColorHex(hexColor);
    } catch {}

    // 2. Classify Outfit Block & Fastening using both Visual Silhouette Metrics + Filename/Notes Hints
    let chosenBlock: "Sheath Dress" | "A-Line Dress" | "Slip Dress" | "Tailored Blazer" | "Button-Down Shirt" | "Kaftan / Boubou" = "Sheath Dress";

    if (
      combinedHint.includes("kaftan") ||
      combinedHint.includes("boubou") ||
      combinedHint.includes("bubu") ||
      combinedHint.includes("agbada") ||
      combinedHint.includes("kimono") ||
      combinedHint.includes("how_it_works")
    ) {
      chosenBlock = "Kaftan / Boubou";
    } else if (
      combinedHint.includes("shirt") ||
      combinedHint.includes("blouse") ||
      combinedHint.includes("button-down") ||
      combinedHint.includes("button down") ||
      combinedHint.includes("top") ||
      combinedHint.includes("placeholder_3")
    ) {
      chosenBlock = "Button-Down Shirt";
    } else if (
      combinedHint.includes("jacket") ||
      combinedHint.includes("blazer") ||
      combinedHint.includes("coat") ||
      combinedHint.includes("suit")
    ) {
      chosenBlock = "Tailored Blazer";
    } else if (
      combinedHint.includes("placeholder_2") ||
      combinedHint.includes("a-line") ||
      combinedHint.includes("flare") ||
      combinedHint.includes("skater")
    ) {
      chosenBlock = "A-Line Dress";
    } else if (
      combinedHint.includes("placeholder_4") ||
      combinedHint.includes("slip") ||
      combinedHint.includes("camisole") ||
      combinedHint.includes("spaghetti") ||
      combinedHint.includes("strap")
    ) {
      chosenBlock = "Slip Dress";
    } else if (combinedHint.includes("placeholder_1")) {
      chosenBlock = "Sheath Dress";
    } else {
      // Pure visual classification for arbitrary uploaded photos without keyword hints
      if (verticalSpanRatio < 0.64 && centerPlacketScore > 22) {
        chosenBlock = shoulderSpreadRatio > 1.18 ? "Tailored Blazer" : "Button-Down Shirt";
      } else if (waistPinchRatio > 0.96 && flareRatio > 0.98 && verticalSpanRatio > 0.75) {
        chosenBlock = "Kaftan / Boubou";
      } else if (flareRatio > 1.24) {
        chosenBlock = "A-Line Dress";
      } else if (centerPlacketScore > 34) {
        chosenBlock = "Button-Down Shirt";
      } else if (shoulderSpreadRatio < 0.86) {
        chosenBlock = "Slip Dress";
      } else {
        chosenBlock = "Sheath Dress";
      }
    }

    handleGarmentBlockChange(chosenBlock);

    // 3. Apply any explicit Fastening / Closure overrides from notes or filename (since not all clothes use a zipper!)
    let finalClosureLabel =
      chosenBlock === "Tailored Blazer" || chosenBlock === "Button-Down Shirt"
        ? "Front Button Placket"
        : chosenBlock === "Kaftan / Boubou"
        ? "Pullover / Slip-On (No Zipper)"
        : chosenBlock === "Slip Dress"
        ? "Side Invisible Zipper (35cm)"
        : "Back Invisible Zipper (55cm)";

    if (
      combinedHint.includes("no zip") ||
      combinedHint.includes("no-zip") ||
      combinedHint.includes("pullover") ||
      combinedHint.includes("slip-on") ||
      combinedHint.includes("cut on fold") ||
      combinedHint.includes("elastic")
    ) {
      finalClosureLabel = "Pullover / Slip-On (No Zipper)";
      handleClosureChange(finalClosureLabel);
    } else if (
      combinedHint.includes("button") &&
      !combinedHint.includes("keyhole")
    ) {
      finalClosureLabel = "Front Button Placket";
      handleClosureChange(finalClosureLabel);
    } else if (combinedHint.includes("keyhole") || combinedHint.includes("loop button")) {
      finalClosureLabel = "Back Keyhole & Loop Button";
      handleClosureChange(finalClosureLabel);
    } else if (combinedHint.includes("side zip")) {
      finalClosureLabel = "Side Invisible Zipper (35cm)";
      handleClosureChange(finalClosureLabel);
    }

    setDetectionConfidence(imgSrc.startsWith("data:") ? 94 : 97);

    if (advanceToStep2) {
      setCurrentStep(2);
      triggerToast(
        `Detected: ${chosenBlock}`,
        `Fastening set to "${finalClosureLabel}" • Dominance ${hexColor}`
      );
    } else {
      triggerToast(
        `Detected: ${chosenBlock}`,
        `Fastening: ${finalClosureLabel} • Ready to calibrate size & fit.`
      );
    }
  };

  // Run AI & Canvas Vision analysis
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await runVisualClothDetection(selectedSample, uploadedFileName, customerNotes, true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Measurements table data calculated via pure deterministic rules
  const calculatedRows: MeasurementRow[] = [
    {
      label: "Bust",
      fieldKey: "bust",
      body: bodyBust,
      rule_id: "Standard bust comfort room",
      ease: easeValues.bust,
      garment: Number((bodyBust + easeValues.bust).toFixed(1)),
      status: `${selectedSize} · ${silhouetteFit}`
    },
    {
      label: "Waist",
      fieldKey: "waist",
      body: bodyWaist,
      rule_id: "Standard waist comfort room",
      ease: easeValues.waist,
      garment: Number((bodyWaist + easeValues.waist).toFixed(1)),
      status: `${selectedSize} · ${silhouetteFit}`
    },
    {
      label: "Hip",
      fieldKey: "hip",
      body: bodyHip,
      rule_id: "Standard hip comfort room",
      ease: easeValues.hip,
      garment: Number((bodyHip + easeValues.hip).toFixed(1)),
      status: `${selectedSize} · ${silhouetteFit}`
    },
    {
      label: "Dress Length",
      fieldKey: "length",
      body: bodyLength,
      rule_id: "Selected hemline cut",
      ease: easeValues.length,
      garment: Number((bodyLength + easeValues.length).toFixed(1)),
      status: `${hemCut} · ${bodyLength} cm`
    }
  ];

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setCurrentStep(3);
      triggerToast("Pattern Ready", `Created pattern sheet for ${selectedSize} (${hemCut} length).`);
    }, 600);
  };

  // Quick inline ease adjuster
  const handleQuickAdjustEase = (fieldKey: "bust" | "waist" | "hip" | "length", delta: number) => {
    const oldVal = easeValues[fieldKey];
    const newVal = Number((oldVal + delta).toFixed(1));
    setEaseValues((prev) => ({ ...prev, [fieldKey]: newVal }));
    
    // Log as correction
    const newEntry: TailorCorrection = {
      field: `${fieldKey} comfort room`,
      oldVal: `+${oldVal.toFixed(1)} cm`,
      newVal: `+${newVal.toFixed(1)} cm`,
      cause: "Fit Adjustment",
      notes: `Adjusted comfort room by ${delta > 0 ? "+" : ""}${delta} cm`,
      timestamp: new Date().toLocaleTimeString(),
      version: versionNumber + 1
    };
    setCorrections([newEntry, ...corrections]);
    setVersionNumber((prev) => prev + 1);
    setVersionStatus("Draft");
    triggerToast(
      `Updated ${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)} Fit (+${newVal} cm)`,
      `Saved as Version #${versionNumber + 1}.`
    );
  };

  const handleAddCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    const newVer = versionNumber + 1;
    const newEntry: TailorCorrection = {
      field: corrField.replace("_ease", " comfort room"),
      oldVal: corrOld,
      newVal: corrNew,
      cause: corrCause,
      notes: corrNotes,
      timestamp: new Date().toLocaleTimeString(),
      version: newVer
    };

    // Dynamically apply to state if it corresponds to an ease or spec value
    const numericNew = parseFloat(corrNew.replace(/[^0-9.-]/g, ""));
    if (corrField === "bust_ease" && !isNaN(numericNew)) {
      setEaseValues((prev) => ({ ...prev, bust: numericNew }));
    } else if (corrField === "waist_ease" && !isNaN(numericNew)) {
      setEaseValues((prev) => ({ ...prev, waist: numericNew }));
    } else if (corrField === "hip_ease" && !isNaN(numericNew)) {
      setEaseValues((prev) => ({ ...prev, hip: numericNew }));
    } else if (corrField === "length" && !isNaN(numericNew)) {
      setBodyLength(numericNew);
    } else if (corrField === "neckline") {
      setAnalysis((prev) => ({ ...prev, neckline: { value: corrNew, status: "observed" } }));
    } else if (corrField === "closure") {
      setClosureChoice(corrNew);
    } else if (corrField === "fabric") {
      setFabricChoice(corrNew);
    }

    setCorrections([newEntry, ...corrections]);
    setVersionNumber(newVer);
    setVersionStatus("Draft");
    setShowTailorModal(false);
    triggerToast(`Fit Adjustment Saved (v${newVer})`, `Updated to ${corrNew}`);
  };

  const handleApprove = () => {
    setVersionStatus("Approved for Sampling");
    setApprovedTimestamp(new Date().toLocaleString());
    triggerToast("Pattern Approved", "Locked and ready to print or share with your tailor.");
  };

  // One-click Share with Tailor (WhatsApp or Copy Summary)
  const handleShareWithTailor = (mode: "whatsapp" | "copy") => {
    const finB = (bodyBust + easeValues.bust).toFixed(1);
    const finW = (bodyWaist + easeValues.waist).toFixed(1);
    const finH = (bodyHip + easeValues.hip).toFixed(1);
    const finL = (bodyLength + easeValues.length).toFixed(1);

    const summaryText = [
      `ASTRA TAILOR PATTERN SHEET (v${versionNumber}.0 - ${versionStatus})`,
      `Style: ${necklineCut}-Neck ${sleeveCut === "Sleeveless" ? "Sleeveless" : `${sleeveCut}-Sleeve`} Dress (${hemCut} Length)`,
      `Size: ${selectedSize} (${silhouetteFit} Fit)`,
      ``,
      `FINAL DRESS MEASUREMENTS (Body + Comfort Room):`,
      `- Bust: ${finB} cm (${(Number(finB) / 2.54).toFixed(1)} in) [Body ${bodyBust}cm + ${easeValues.bust}cm ease]`,
      `- Waist: ${finW} cm (${(Number(finW) / 2.54).toFixed(1)} in) [Body ${bodyWaist}cm + ${easeValues.waist}cm ease]`,
      `- Hip: ${finH} cm (${(Number(finH) / 2.54).toFixed(1)} in) [Body ${bodyHip}cm + ${easeValues.hip}cm ease]`,
      `- Length: ${finL} cm (${(Number(finL) / 2.54).toFixed(1)} in)`,
      ``,
      `SEAM ALLOWANCES: 1.5 cm sides/shoulders/zipper | 1.0 cm neck/armholes | 4.0 cm bottom hem`,
      `FABRIC TO BUY: ${fabricYardage.yards60} yds (${fabricYardage.meters60} m) for 60" width | ${fabricYardage.yards45} yds (${fabricYardage.meters45} m) for 45" / Ankara width`,
      `FABRIC & ZIPPER: ${fabricChoice} | ${closureChoice}`,
      customerNotes ? `TAILOR NOTES: ${customerNotes}` : ``
    ]
      .filter(Boolean)
      .join("\n");

    if (mode === "whatsapp") {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      triggerToast("Opening WhatsApp", "Tailor measurement and yardage sheet ready to send.");
    } else {
      try {
        navigator.clipboard.writeText(summaryText);
        triggerToast("Copied for Tailor", "Full measurements, seam allowances, and fabric yardage copied to clipboard.");
      } catch {
        triggerToast("Summary Ready", "Tailor summary generated.", "info");
      }
    }
  };

  // Build high-grade printable HTML Tailor Pack for PDF export and offline storage
  const buildClientTailorPackHTML = (): string => {
    const finBustNum = bodyBust + easeValues.bust;
    const finWaistNum = bodyWaist + easeValues.waist;
    const finHipNum = bodyHip + easeValues.hip;
    const finLenNum = bodyLength + easeValues.length;

    const finishedBust = finBustNum.toFixed(1);
    const finishedWaist = finWaistNum.toFixed(1);
    const finishedHip = finHipNum.toFixed(1);
    const finishedLength = finLenNum.toFixed(1);

    const pHemY = hemCut === "Mini" ? 345 : hemCut === "Maxi" ? 430 : 390;
    const pBustW = Math.round(64 + (finBustNum - 96) * 0.42);
    const pWaistW = Math.round(46 + (finWaistNum - 77) * 0.4);
    const pHipW = Math.round(58 + (finHipNum - 102.5) * 0.42);
    const pHemW = Math.round(hemCut === "Maxi" ? pHipW + 14 : hemCut === "Mini" ? pHipW - 2 : pHipW + 5);
    const pZipY = Math.min(pHemY - 35, 275);

    const pNeckClosure =
      necklineCut === "Round"
        ? `C 28 80, -28 80, -28 42 Z`
        : necklineCut === "V-Neck"
        ? `L 0 98 L -28 42 Z`
        : necklineCut === "Sweetheart"
        ? `L 28 70 C 20 58, 6 62, 0 84 C -6 62, -20 58, -28 70 L -28 42 Z`
        : `L 28 84 L -28 84 Z`;

    const pFrontStitch = [
      `M -28 42`,
      `L -44 52`,
      `C -40 80, -${pBustW - 8} 106, -${pBustW} 122`,
      `C -${pBustW - 2} 158, -${pWaistW + 3} 188, -${pWaistW} 210`,
      `C -${pWaistW + 4} 238, -${pHipW - 2} 266, -${pHipW} 298`,
      `L -${pHemW} ${pHemY}`,
      `Q 0 ${pHemY + 6} ${pHemW} ${pHemY}`,
      `L ${pHipW} 298`,
      `C ${pHipW - 2} 266, ${pWaistW + 4} 238, ${pWaistW} 210`,
      `C ${pWaistW + 3} 188, ${pBustW - 2} 158, ${pBustW} 122`,
      `C ${pBustW - 8} 106, 40 80, 44 52`,
      `L 28 42`,
      pNeckClosure
    ].join(" ");

    const pBackStitch = [
      `M -28 42`,
      `L -44 52`,
      `C -40 80, -${pBustW - 8} 106, -${pBustW} 122`,
      `C -${pBustW - 2} 158, -${pWaistW + 3} 188, -${pWaistW} 210`,
      `C -${pWaistW + 4} 238, -${pHipW - 2} 266, -${pHipW} 298`,
      `L -${pHemW} ${pHemY}`,
      `Q 0 ${pHemY + 5} ${pHemW} ${pHemY}`,
      `L ${pHipW} 298`,
      `C ${pHipW - 2} 266, ${pWaistW + 4} 238, ${pWaistW} 210`,
      `C ${pWaistW + 3} 188, ${pBustW - 2} 158, ${pBustW} 122`,
      `C ${pBustW - 8} 106, 40 80, 44 52`,
      `L 28 42`,
      `Q 0 56 -28 42`,
      `Z`
    ].join(" ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Astra Tailor Pack - Dress v${versionNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
      color: #1E1E1E;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      line-height: 1.45;
      font-size: 11.5px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #4F4F4F;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 600;
      color: #1E1E1E;
      letter-spacing: -0.4px;
      margin: 0 0 3px 0;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      border-radius: 4px;
      margin-left: 6px;
    }
    .badge-approved { background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
    .badge-draft { background: #f2f2f2; color: #4f4f4f; border: 1px solid #e0e0e0; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid #d4d4d8;
      border-radius: 6px;
      padding: 12px;
      background: #fafafa;
    }
    .card-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #18181b;
      margin-top: 0;
      margin-bottom: 8px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    th {
      background: #f4f4f5;
      color: #18181b;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #d4d4d8;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #d4d4d8;
      color: #18181b;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
    .font-bold { font-weight: 700; }
    .drawing-container {
      border: 1px solid #d4d4d8;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      background: #ffffff;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    ol { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; color: #18181b; }
    .signoff-box {
      margin-top: 20px;
      border-top: 1.5px solid #18181b;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .signoff-line {
      width: 200px;
      border-bottom: 1px solid #18181b;
      height: 26px;
      margin-top: 4px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">ASTRA PATTERN & TAILOR SHEET</div>
      <div style="font-size: 11.5px; color: #27272a;">
        <strong>Style:</strong> ${necklineCut}-Neck ${sleeveCut === "Sleeveless" ? "Sleeveless" : `${sleeveCut}-Sleeve`} Dress |
        <strong>Size:</strong> ${selectedSize} |
        <strong>Length:</strong> ${hemCut} (${bodyLength} cm) &bull; ${silhouetteFit}
        <span class="badge ${versionStatus === "Approved for Sampling" ? "badge-approved" : "badge-draft"}">
          ${versionStatus}
        </span>
      </div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #27272a;" class="mono">
      <div><strong>DATE:</strong> ${new Date().toLocaleDateString()}</div>
      <div><strong>SCALE:</strong> 1:10 METRIC</div>
      <div><strong>VERSION:</strong> v${versionNumber}.0</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">1. Materials & Fabric Yardage to Buy</div>
      <div><strong>Main Fabric:</strong> ${fabricChoice}</div>
      <div><strong>60" (150cm) Wide Roll:</strong> ${fabricYardage.yards60} yards (${fabricYardage.meters60} meters)</div>
      <div><strong>45" (115cm) / Ankara Roll:</strong> ${fabricYardage.yards45} yards (${fabricYardage.meters45} meters)</div>
      <div><strong>Zipper / Closure:</strong> ${closureChoice}</div>
      <div><strong>Neckline Facing:</strong> 4.5 cm shaped facing + fusible stay-tape</div>
    </div>
    <div class="card">
      <div class="card-title">2. Seam Allowances</div>
      <div><strong>Side & Shoulder Seams:</strong> 1.5 cm (5/8 in)</div>
      <div><strong>Neckline & Armholes:</strong> 1.0 cm (3/8 in)</div>
      <div><strong>Back Zipper Seam:</strong> 1.5 cm reinforced</div>
      <div><strong>Bottom Hem Fold:</strong> 4.0 cm (1.5 in)</div>
      <div><strong>Sizing Standard:</strong> UK Metric Tailoring Standard</div>
    </div>
  </div>

  <div class="card-title" style="margin-top: 12px;">3. Body vs. Finished Dress Measurements (Size: ${selectedSize})</div>
  <table>
    <thead>
      <tr>
        <th>Area</th>
        <th>Body Size (cm)</th>
        <th>Comfort Room Added</th>
        <th style="background: #333333; color: #ffffff;">Final Dress Size (cm)</th>
        <th>Seam Allowance</th>
      </tr>
    </thead>
    <tbody class="mono">
      <tr>
        <td class="font-bold" style="font-family: inherit;">1. Bust</td>
        <td>${bodyBust.toFixed(1)} cm</td>
        <td>+${easeValues.bust.toFixed(1)} cm</td>
        <td class="font-bold" style="background: #f2f2f2; font-size: 12.5px;">${finishedBust} cm</td>
        <td>1.5 cm side seam</td>
      </tr>
      <tr>
        <td class="font-bold" style="font-family: inherit;">2. Waist</td>
        <td>${bodyWaist.toFixed(1)} cm</td>
        <td>+${easeValues.waist.toFixed(1)} cm</td>
        <td class="font-bold" style="background: #f2f2f2; font-size: 12.5px;">${finishedWaist} cm</td>
        <td>1.5 cm + 2.5 cm dart</td>
      </tr>
      <tr>
        <td class="font-bold" style="font-family: inherit;">3. Hip</td>
        <td>${bodyHip.toFixed(1)} cm</td>
        <td>+${easeValues.hip.toFixed(1)} cm</td>
        <td class="font-bold" style="background: #f2f2f2; font-size: 12.5px;">${finishedHip} cm</td>
        <td>1.5 cm side seam</td>
      </tr>
      <tr>
        <td class="font-bold" style="font-family: inherit;">4. Dress Length (${hemCut})</td>
        <td>${bodyLength.toFixed(1)} cm</td>
        <td>+${easeValues.length.toFixed(1)} cm</td>
        <td class="font-bold" style="background: #f2f2f2; font-size: 12.5px;">${finishedLength} cm</td>
        <td>4.0 cm blind hem</td>
      </tr>
    </tbody>
  </table>

  <div class="card-title">4. 1:10 Pattern Drawing (Front & Back Pieces)</div>
  <div class="drawing-container">
    <svg viewBox="0 0 860 475" width="100%" height="275" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 780px; margin: 0 auto; display: block;">
      <defs>
        <pattern id="printGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e5e5" stroke-width="0.6" />
        </pattern>
      </defs>
      <rect width="860" height="475" fill="url(#printGrid)" rx="4" />
      <rect x="1" y="1" width="858" height="473" fill="none" stroke="#bdbdbd" stroke-width="1.2" rx="4" />

      <!-- FRONT BLOCK -->
      <g transform="translate(220, 16)">
        <text x="0" y="16" fill="#333333" font-size="11" text-anchor="middle" font-weight="600" letter-spacing="1">FRONT CAD BLOCK (${selectedSize})</text>
        <!-- Outer Seam Allowance Cut Line -->
        <path d="${pFrontStitch}" transform="scale(1.055, 1.02) translate(0, -4)" fill="none" stroke="#757575" stroke-width="1" stroke-dasharray="4 3" />
        <!-- Net Sewing Line -->
        <path d="${pFrontStitch}" fill="#ffffff" stroke="#333333" stroke-width="2" stroke-linejoin="round" />
        <!-- Facing Line -->
        <path d="M -33 46 L -33 92 L 33 92 L 33 46" fill="none" stroke="#4f4f4f" stroke-width="1" stroke-dasharray="3 2" />
        <!-- Center Front Grainline -->
        <line x1="0" y1="84" x2="0" y2="${pHemY}" stroke="#a1a1aa" stroke-width="0.8" stroke-dasharray="2 3" />
        <line x1="-38" y1="145" x2="-38" y2="${pHemY - 45}" stroke="#4f4f4f" stroke-width="1.1" />
        <polygon points="-38,140 -41,148 -35,148" fill="#4f4f4f" />
        <polygon points="-38,${pHemY - 40} -41,${pHemY - 48} -35,${pHemY - 48}" fill="#4f4f4f" />
        <!-- Anatomical Level Lines -->
        <line x1="-${pBustW}" y1="122" x2="${pBustW}" y2="122" stroke="#757575" stroke-width="0.9" stroke-dasharray="3 3" />
        <line x1="-${pWaistW}" y1="210" x2="${pWaistW}" y2="210" stroke="#4f4f4f" stroke-width="1" stroke-dasharray="4 3" />
        <line x1="-${pHipW}" y1="298" x2="${pHipW}" y2="298" stroke="#757575" stroke-width="0.9" stroke-dasharray="3 3" />
        <!-- Bust Apex Targets & Side Bust Darts -->
        <circle cx="-24" cy="128" r="3.5" fill="none" stroke="#4f4f4f" stroke-width="1" />
        <circle cx="24" cy="128" r="3.5" fill="none" stroke="#4f4f4f" stroke-width="1" />
        <path d="M -${pBustW} 142 L -28 130 L -${pBustW - 1} 154" fill="none" stroke="#4f4f4f" stroke-width="1.1" />
        <path d="M ${pBustW} 142 L 28 130 L ${pBustW - 1} 154" fill="none" stroke="#4f4f4f" stroke-width="1.1" />
        <!-- Diamond Waist Suppression Darts -->
        <path d="M -23 150 L -18 210 L -23 268 L -28 210 Z" fill="rgba(79,79,79,0.06)" stroke="#4f4f4f" stroke-width="1.2" />
        <path d="M 23 150 L 28 210 L 23 268 L 18 210 Z" fill="rgba(79,79,79,0.06)" stroke="#4f4f4f" stroke-width="1.2" />
        <!-- Hem Allowance Fold -->
        <path d="M -${pHemW - 1} ${pHemY - 14} Q 0 ${pHemY - 8} ${pHemW - 1} ${pHemY - 14}" fill="none" stroke="#757575" stroke-width="1" stroke-dasharray="3 3" />
        <!-- Dimension Callouts -->
        <text x="${pBustW + 14}" y="125" fill="#333333" font-size="9.5" font-weight="500">BUST ${finishedBust}cm</text>
        <text x="${pWaistW + 14}" y="213" fill="#333333" font-size="9.5" font-weight="500">WAIST ${finishedWaist}cm</text>
        <text x="${pHipW + 14}" y="301" fill="#333333" font-size="9.5" font-weight="500">HIP ${finishedHip}cm</text>
        <line x1="-${pHemW + 24}" y1="42" x2="-${pHemW + 24}" y2="${pHemY}" stroke="#4f4f4f" stroke-width="1.2" />
        <text x="-${pHemW + 32}" y="${(pHemY + 42) / 2}" fill="#333333" font-size="9.5" font-weight="500" text-anchor="end">LEN ${finishedLength}cm</text>
      </g>

      <!-- BACK BLOCK -->
      <g transform="translate(630, 16)">
        <text x="0" y="16" fill="#333333" font-size="11" text-anchor="middle" font-weight="600" letter-spacing="1">BACK CAD BLOCK (${selectedSize})</text>
        <!-- Outer Seam Allowance Cut Line -->
        <path d="${pBackStitch}" transform="scale(1.055, 1.02) translate(0, -4)" fill="none" stroke="#757575" stroke-width="1" stroke-dasharray="4 3" />
        <!-- Net Sewing Line -->
        <path d="${pBackStitch}" fill="#ffffff" stroke="#333333" stroke-width="2" stroke-linejoin="round" />
        <!-- Back Neck Facing -->
        <path d="M -32 45 Q 0 62 32 45" fill="none" stroke="#4f4f4f" stroke-width="1" stroke-dasharray="3 2" />
        <!-- Center Back Invisible Zipper Track -->
        <line x1="0" y1="50" x2="0" y2="${pZipY}" stroke="#333333" stroke-width="2" stroke-dasharray="5 2.5" />
        <rect x="-4" y="52" width="8" height="10" rx="1.5" fill="#4f4f4f" />
        <line x1="-6" y1="${pZipY}" x2="6" y2="${pZipY}" stroke="#333333" stroke-width="1.8" />
        <line x1="0" y1="${pZipY}" x2="0" y2="${pHemY}" stroke="#4f4f4f" stroke-width="1.3" />
        <!-- Back Waist Darts -->
        <path d="M -23 142 L -17 210 L -23 274 L -29 210 Z" fill="rgba(79,79,79,0.06)" stroke="#4f4f4f" stroke-width="1.2" />
        <path d="M 23 142 L 29 210 L 23 274 L 17 210 Z" fill="rgba(79,79,79,0.06)" stroke="#4f4f4f" stroke-width="1.2" />
        <!-- Hem Allowance Fold -->
        <path d="M -${pHemW - 1} ${pHemY - 14} Q 0 ${pHemY - 9} ${pHemW - 1} ${pHemY - 14}" fill="none" stroke="#757575" stroke-width="1" stroke-dasharray="3 3" />
        <text x="${pBustW + 14}" y="175" fill="#333333" font-size="9.5" font-weight="500">55cm CB ZIPPER</text>
      </g>
    </svg>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">5. Order of Construction (Sample Room Sequence)</div>
      <ol style="font-size: 11px;">
        <li>Apply fusible interfacing to neckline facings; stay-stitch curves at 1.0 cm.</li>
        <li>Sew front bodice bust darts and back waist darts; press inward toward center.</li>
        <li>Join front and back shoulder seams; press open. Attach facing and understitch 2mm.</li>
        <li>Insert 55 cm invisible zipper into center-back seam using 1.5 cm seam allowance.</li>
        <li>Join side seams from underarm to hemline; serge finish edges.</li>
        <li>Turn up 4.0 cm hem allowance, press, and blind-hem stitch or topstitch.</li>
      </ol>
    </div>
    <div class="card">
      <div class="card-title">6. Audit History & Tailor Corrections (${corrections.length} Logged)</div>
      ${
        corrections.length === 0
          ? '<p style="color: #3f3f46; font-size: 11px; margin: 0;">Baseline revision v1.0. No manual overrides logged yet.</p>'
          : `<div style="font-size: 10.5px; max-height: 120px; overflow-y: auto;" class="mono">
              ${corrections
                .map(
                  (c) => `<div style="padding: 3px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong>v${c.version} [${c.field}]:</strong> ${c.oldVal} &rarr; <strong>${c.newVal}</strong> (${c.cause})
                  </div>`
                )
                .join("")}
            </div>`
      }
    </div>
  </div>

  <div class="signoff-box">
    <div>
      <div><strong>Technical Tailor / Pattern Maker:</strong></div>
      <div class="signoff-line"></div>
      <div style="color: #3f3f46; font-size: 10px; margin-top: 3px;">Sign & Print Name</div>
    </div>
    <div>
      <div><strong>Sampling Approval Stamp:</strong></div>
      <div style="width: 150px; height: 36px; border: 1.5px solid #4f4f4f; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; color: #333333; margin-top: 4px;">
        ${versionStatus === "Approved for Sampling" ? "APPROVED FOR SAMPLE" : "PENDING SIGN-OFF"}
      </div>
    </div>
    <div>
      <div><strong>Approval Date:</strong></div>
      <div class="signoff-line"></div>
      <div style="color: #3f3f46; font-size: 10px; margin-top: 3px;">${approvedTimestamp || "Pending Approval"}</div>
    </div>
  </div>
</body>
</html>`;
  };

  // Export 1: High-Fidelity Tailor Pack PDF (Generates Printable HTML & Opens Native Print / Save to PDF)
  const handleExportPDF = () => {
    try {
      const tailorPackHTML = buildClientTailorPackHTML();

      // 1. Direct downloadable HTML backup file
      const blob = new Blob([tailorPackHTML], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Astra_TailorPack_Dress_v${versionNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 2. Open print dialog for instant "Save as PDF"
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(tailorPackHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch {}
        }, 500);
      }

      triggerToast(
        "Tailor Pack Blueprint Exported!",
        `Print dialog opened (Save as PDF) & Astra_TailorPack_Dress_v${versionNumber}.html downloaded.`
      );
    } catch (err) {
      console.error("Export error", err);
      triggerToast("Export Notice", "Generated tailor pack document.", "info");
    }
  };

  // Export 2: Direct CAD SVG Download (for Seamly2D, Clo3D, or Illustrator)
  const handleDownloadSVG = () => {
    try {
      let svgContent = "";
      if (svgRef.current) {
        svgContent = new XMLSerializer().serializeToString(svgRef.current);
      }

      if (!svgContent || svgContent.length < 50) {
        throw new Error("SVG ref not populated");
      }

      // Ensure proper namespaces
      if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgContent = svgContent.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
      }

      const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Astra_Technical_Flat_Dress_v${versionNumber}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerToast("Vector CAD SVG Downloaded", `Astra_Technical_Flat_Dress_v${versionNumber}.svg ready for CAD import.`);
    } catch (err) {
      console.error("SVG export error", err);
      triggerToast("SVG Notice", "Could not extract raw canvas vector. Please try again.", "info");
    }
  };

  // Export 3: Deterministic JSON Tailor Pack Specification
  const handleDownloadJSON = () => {
    const spec = {
      garment: "dress_basic_v1",
      pattern_size: selectedSize,
      hem_cut: hemCut,
      silhouette_fit: silhouetteFit,
      version: versionNumber,
      status: versionStatus,
      timestamp: new Date().toISOString(),
      client_body_cm: {
        bust: bodyBust,
        waist: bodyWaist,
        hip: bodyHip,
        length: bodyLength
      },
      wearing_ease_cm: easeValues,
      finished_garment_cm: {
        bust: Number((bodyBust + easeValues.bust).toFixed(1)),
        waist: Number((bodyWaist + easeValues.waist).toFixed(1)),
        hip: Number((bodyHip + easeValues.hip).toFixed(1)),
        length: Number((bodyLength + easeValues.length).toFixed(1))
      },
      seam_allowances_cm: {
        side_seams: 1.5,
        shoulder_seams: 1.5,
        neckline_armhole: 1.0,
        hemline: 4.0,
        zipper_center_back: 1.5
      },
      materials: {
        fabric: fabricChoice,
        closure: closureChoice
      },
      audit_corrections: corrections
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Astra_TailorPack_Spec_v${versionNumber}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast("JSON Spec Downloaded", `Saved Astra_TailorPack_Spec_v${versionNumber}.json.`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1E1E1E] flex flex-col font-sans antialiased selection:bg-[#E0E0E0] selection:text-[#1E1E1E]">
      {/* Toast Notification Container - Astra Light Surface (Zero pitch black) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl bg-white text-[#1E1E1E] border border-[#E0E0E0] shadow-[0_12px_32px_rgba(0,0,0,0.08)] backdrop-blur-md flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#F8F8F8] text-[#4F4F4F] border border-[#E5E5E5] shrink-0">
              <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <h4 className="text-xs font-medium text-[#1E1E1E] tracking-tight">{toast.title}</h4>
              <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">{toast.desc}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-[#757575] hover:text-[#1E1E1E] text-xs p-1 transition-colors cursor-pointer shrink-0">
              <RiCloseLine className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / Navigation - Astra Gray & Remix Icons */}
      <header className="border-b border-[#E5E5E5] bg-white/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(1);
              } else {
                setTutorialSlide(0);
                setShowTutorialModal(true);
              }
            }}
            className={`flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-1.5 flex-shrink-0 ${SECONDARY_PILL_BTN}`}>
            {currentStep > 1 ? (
              <>
                <RiArrowLeftLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#757575]" />
                <span className="hidden sm:inline">Choose Outfit</span>
                <span className="sm:hidden">Back</span>
              </>
            ) : (
              <>
                <RiScissors2Line className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#757575]" />
                <span className="hidden sm:inline">Tailor Showcase</span>
                <span className="sm:hidden">Demo</span>
              </>
            )}
          </button>
          <div className="h-4 w-px bg-[#E5E5E5] hidden sm:block flex-shrink-0" />
          <div className="flex items-center gap-2.5 min-w-0">
            <NextImage
              src="/astra-logo.svg"
              alt="Astra Logo"
              width={88}
              height={24}
              className="w-[78px] sm:w-[88px] h-auto flex-shrink-0"
              priority
            />
            <div className="h-3.5 w-px bg-[#E5E5E5] hidden md:block flex-shrink-0" />
            <span className="font-[ClashGrotesk-Medium] font-medium text-xs sm:text-sm text-[#757575] truncate hidden md:inline">
              Pattern Studio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Unit Toggle: CM / IN with Framer Motion sliding pill */}
          <div className="flex items-center p-0.5 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-[11px] font-mono relative">
            {(["cm", "in"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`relative px-2.5 py-1 rounded-full transition-colors duration-150 cursor-pointer ${
                  unit === u ? "text-[#1E1E1E] font-medium" : "text-[#757575] font-medium hover:text-[#1E1E1E]"
                }`}>
                {unit === u && (
                  <motion.span
                    layoutId="header-unit-pill"
                    transition={TACTILE_SPRING}
                    className="absolute inset-0 rounded-full bg-white border border-[#D0D5DD] shadow-2xs"
                  />
                )}
                <span className="relative z-10">{u.toUpperCase()}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setTutorialSlide(0);
              setShowTutorialModal(true);
            }}
            className={`group flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] sm:text-xs ${SECONDARY_PILL_BTN}`}>
            <RiLightbulbLine className="w-3.5 h-3.5 text-[#757575] transition-transform duration-200 group-hover:scale-110" />
            <span>How It Works</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuestionsModal(true)}
            className={`group flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] sm:text-xs ${SECONDARY_PILL_BTN}`}>
            <RiQuestionLine className="w-3.5 h-3.5 text-[#757575] transition-transform duration-200 group-hover:scale-110" />
            <span className="hidden sm:inline">Sizing &amp; Fit Guide</span>
            <span className="sm:hidden">Sizing</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-7">
        {/* Step Indicator (3-Step Streamlined Wizard - Sliding Gray Outline Highlight) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {[
            { step: 1, title: "1. Choose Design", desc: "Upload a photo or pick an outfit block" },
            { step: 2, title: "2. Size & Fit", desc: "Pick size, body measurements & fastening" },
            { step: 3, title: "3. Pattern & Tailor Sheet", desc: "CAD vector flat, measurements & guide" }
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <motion.button
                key={item.step}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.16, ease: EDITORIAL_EASE }}
                onClick={() => setCurrentStep(item.step)}
                className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-colors duration-200 cursor-pointer overflow-hidden ${
                  isActive
                    ? "bg-white border-transparent text-[#1E1E1E]"
                    : isCompleted
                    ? "bg-[#F8F8F8] border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F]"
                    : "bg-white border-[#E0E0E0] hover:border-[#BDBDBD] text-[#757575]"
                }`}>
                {isActive && (
                  <motion.div
                    layoutId="wizard-active-step"
                    transition={TACTILE_SPRING}
                    className="absolute inset-0 rounded-2xl border border-[#757575] ring-1 ring-[#BDBDBD]/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] pointer-events-none"
                  />
                )}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <motion.span
                      key={`${item.step}-${isActive ? "a" : isCompleted ? "c" : "i"}`}
                      initial={{ scale: 0.85, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={TACTILE_SPRING}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-medium transition-colors duration-200 ${
                        isActive
                          ? "bg-[#4F4F4F] text-white"
                          : isCompleted
                          ? "bg-[#F2F2F2] text-[#4F4F4F] border border-[#BDBDBD]"
                          : "bg-[#F2F2F2] text-[#757575] border border-[#E0E0E0]"
                      }`}>
                      {isCompleted ? <RiCheckLine className="w-3 h-3" /> : item.step}
                    </motion.span>
                    <span className={`text-xs sm:text-sm font-medium tracking-tight ${isActive ? "text-[#1E1E1E]" : "text-[#4F4F4F]"}`}>
                      {item.title}
                    </span>
                  </div>
                  {isCompleted && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={TACTILE_SPRING}>
                      <RiCheckLine className="w-4 h-4 text-[#757575] flex-shrink-0" />
                    </motion.span>
                  )}
                </div>
                <p className={`relative z-10 text-[11px] mt-1 pl-7 truncate font-normal ${isActive ? "text-[#4F4F4F]" : "text-[#757575]"}`}>
                  {item.desc}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* STEP 1 / STEP 2 / STEP 3 Crossfade Stage */}
        <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="studio-step-1"
            initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-5">
              <div>
                <h2 className="text-2xl font-medium text-[#1E1E1E] tracking-tight font-[ClashGrotesk-medium]">
                  Choose Your Outfit Design
                </h2>
                <p className="text-sm text-[#4F4F4F] font-normal mt-1">
                  Upload a photo or sketch of the outfit you want to make, or pick one of the studio styles below.
                </p>
              </div>

              {/* Clean Studio Note Strip */}
              <div className="p-4 rounded-2xl bg-white border border-[#E0E0E0] flex items-start justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#4F4F4F] flex items-center justify-center shrink-0 mt-0.5">
                    <RiLightbulbLine className="w-4 h-4 text-[#757575]" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-sm text-[#1E1E1E]">How it works</p>
                    <p className="text-[#4F4F4F] font-normal leading-relaxed">
                      Start by choosing a photo or sample style below. On the next screen, you&apos;ll pick the size and fit, and we&apos;ll create a ready-to-sew pattern sheet for your tailor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTutorialSlide(0);
                    setShowTutorialModal(true);
                  }}
                  className={`shrink-0 px-3.5 py-1.5 text-[11px] ${SECONDARY_PILL_BTN}`}>
                  Quick Tour
                </button>
              </div>

              {/* Quick Jump for Reviewers - Highlighted Underlined Link instead of competing dark button */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E0E0E0] text-xs shadow-2xs">
                <span className="text-[#4F4F4F] flex items-center gap-2 font-medium">
                  <RiSparkling2Line className="w-4 h-4 text-[#757575]" />
                  Want to see a finished pattern right away?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(3);
                    triggerToast("Sample Pattern Opened", "Viewing the ready-to-sew pattern and tailor sheet.");
                  }}
                  className={HIGHLIGHT_LINK_BTN}>
                  <span>Preview Pattern</span>
                  <RiArrowRightLine className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload Input & Dropzone */}
              <input
                ref={step1FileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadedFileName ? (
                /* Active Uploaded File Card */
                <div className="p-4 rounded-2xl bg-white border border-[#757575] ring-1 ring-[#BDBDBD]/60 flex items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#E0E0E0] bg-[#F8F8F8] flex-shrink-0 relative">
                      <img src={selectedSample} alt="Uploaded Garment" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#1E1E1E] truncate max-w-[200px]">
                          {uploadedFileName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F2F2F2] text-[#4F4F4F] border border-[#E0E0E0]">
                          {uploadedFileSize || "Uploaded"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4F4F4F] font-normal mt-0.5">
                        Photo ready. Click Next below to choose size and fit.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => step1FileInputRef.current?.click()}
                      className={`px-3.5 py-1.5 text-xs ${SECONDARY_PILL_BTN}`}>
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={handleClearUpload}
                      title="Remove uploaded photo"
                      className={`p-2 text-[#757575] hover:text-[#1E1E1E] ${SECONDARY_PILL_BTN}`}>
                      <RiDeleteBin6Line className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Zone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => step1FileInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-2.5 ${
                    isDragOver
                      ? "border-[#757575] bg-[#F2F2F2]"
                      : "border-[#E0E0E0] bg-white hover:border-[#BDBDBD] hover:bg-[#FAFAFA]"
                  }`}>
                  <div className="w-12 h-12 rounded-2xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#757575] flex items-center justify-center shadow-2xs">
                    <RiUploadCloud2Line className="w-5 h-5 text-[#757575]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1E1E1E]">
                      Upload an outfit photo or sketch
                    </p>
                    <p className="text-xs text-[#4F4F4F] font-normal mt-0.5">
                      Drag &amp; drop an image here, or <span className="text-[#4285f4] font-medium underline underline-offset-4">browse your files</span>
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-[#F2F2F2] border border-[#E0E0E0] text-[#4F4F4F]">
                    PNG, JPG, WEBP, or SVG
                  </span>
                </div>
              )}

              {/* Sample Benchmark Selector (6 Garment Blocks with Distinct Fastenings) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#4F4F4F] uppercase tracking-wider text-[11px]">
                    Or start with a sample outfit block:
                  </span>
                  {uploadedFileName && (
                    <span className="text-[11px] text-[#757575] font-normal">
                      (Picking a sample replaces your uploaded photo)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "/design_placeholder_1.png", label: "Sheath Dress", block: "Sheath Dress" as const, tag: "55cm Back Zip" },
                    { id: "/design_placeholder_2.png", label: "A-Line Dress", block: "A-Line Dress" as const, tag: "55cm Back Zip" },
                    { id: "/design_placeholder_4.png", label: "Slip Dress", block: "Slip Dress" as const, tag: "35cm Side Zip" },
                    { id: "/designs_jacket.png", label: "Tailored Blazer", block: "Tailored Blazer" as const, tag: "Front Buttons" },
                    { id: "/design_placeholder_3.png", label: "Button-Down Shirt", block: "Button-Down Shirt" as const, tag: "Front Buttons" },
                    { id: "/how_It_works_designOutfit.png", label: "Kaftan / Boubou", block: "Kaftan / Boubou" as const, tag: "No Zipper (Fold)" }
                  ].map((item) => {
                    const isSelected = garmentBlock === item.block && !uploadedFileName;
                    return (
                      <motion.button
                        key={item.block}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.16, ease: EDITORIAL_EASE }}
                        onClick={() => handleSelectSampleStyle(item.id, item.label, item.block)}
                        className={`relative p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col items-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                          isSelected ? "bg-[#F2F2F2] text-[#1E1E1E] border-transparent" : OPTION_IDLE
                        }`}>
                        {isSelected && (
                          <motion.div
                            layoutId="step1-sample-active"
                            transition={TACTILE_SPRING}
                            className="absolute inset-0 rounded-2xl border border-[#757575] ring-1 ring-[#BDBDBD]/60 shadow-2xs pointer-events-none"
                          />
                        )}
                        <div className="relative z-10 w-full aspect-[4/4] rounded-xl overflow-hidden bg-[#F8F8F8] border border-[#E5E5E5] flex items-center justify-center group">
                          <img src={item.id} alt={item.label} className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" />
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-[#4F4F4F] border border-[#E0E0E0] text-[9px] font-mono font-medium shadow-2xs">
                            {item.tag}
                          </span>
                        </div>
                        <span className={`relative z-10 text-[11px] font-medium text-center truncate w-full ${isSelected ? "text-[#1E1E1E]" : "text-[#4F4F4F]"}`}>
                          {item.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Notes */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-[#4F4F4F] flex items-center justify-between">
                  <span>Notes for the Tailor</span>
                  <span className="text-[10px] text-[#757575] bg-[#F2F2F2] px-2.5 py-0.5 rounded-full border border-[#E0E0E0] font-medium">
                    Optional
                  </span>
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 rounded-xl bg-white border border-[#E0E0E0] text-[#1E1E1E] font-normal text-sm focus:outline-none focus:border-[#757575] focus:ring-1 focus:ring-[#BDBDBD] resize-none transition-colors placeholder:text-[#757575]"
                  placeholder="Add any special requests, e.g. 'pullover with no zipper', 'front buttons', 'side zip', or fabric notes..."
                />
              </div>

              {/* Bottom Guided Navigation Bar */}
              <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTutorialSlide(0);
                    setShowTutorialModal(true);
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs flex items-center justify-center gap-2 ${SECONDARY_PILL_BTN}`}>
                  <RiLightbulbLine className="w-3.5 h-3.5 text-[#757575]" />
                  Quick Studio Guide
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 ${PRIMARY_PILL_BTN}`}>
                  {isAnalyzing ? (
                    <>
                      <RiRefreshLine className="w-4 h-4 animate-spin" />
                      Detecting Cloth &amp; Fastening...
                    </>
                  ) : (
                    <>
                      Next: Size &amp; Fit
                      <RiArrowRightLine className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Preview Card + Live Cloth & Fastening Detection Inspector */}
            <div className="lg:col-span-6 bg-white border border-[#E0E0E0] rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-between gap-4 relative overflow-hidden shadow-2xs">
              <div className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-[3/4] rounded-2xl overflow-hidden border border-[#E0E0E0] shadow-xs bg-[#F8F8F8]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedSample}
                    src={selectedSample}
                    alt="Design Preview"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.26, ease: EDITORIAL_EASE }}
                    className="object-cover w-full h-full"
                  />
                </AnimatePresence>
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-md border border-[#E0E0E0] rounded-full text-[11px] font-mono font-medium text-[#1E1E1E] shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {uploadedFileName ? `Photo: ${uploadedFileName.substring(0, 14)}...` : garmentBlock}
                </div>
                <motion.div
                  key={closureChoice}
                  initial={{ opacity: 0.6, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                  className="absolute bottom-3 left-3 right-3 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-[#E0E0E0] rounded-full text-[10px] font-mono font-medium text-[#4F4F4F] shadow-sm flex items-center justify-between">
                  <span className="text-[#757575] font-mono">FASTENING:</span>
                  <span className="text-[#1E1E1E] font-medium truncate ml-1.5">{closureChoice}</span>
                </motion.div>
              </div>

              {/* Live Cloth & Fastening Detection Panel - Astra Gray Style */}
              <div className="w-full rounded-2xl bg-[#F8F8F8] border border-[#E5E5E5] p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <RiSparkling2Line className="w-4 h-4 text-[#757575]" />
                    <span className="text-xs font-medium text-[#1E1E1E] uppercase tracking-wider">
                      Cloth &amp; Fastening Detection
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E0E0E0] text-[10px] font-mono font-medium text-[#4F4F4F]">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-[#BDBDBD] inline-block transition-colors duration-300"
                        style={{ backgroundColor: detectedColorHex }}
                      />
                      {detectedColorHex}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-[#4F4F4F] text-[10px] font-mono font-medium">
                      {detectionConfidence}% MATCH
                    </span>
                  </div>
                </div>

                {/* Detected Signals List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {detectionSignals.map((sig, i) => (
                    <motion.div
                      key={`${sig}-${i}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.04, ease: EDITORIAL_EASE }}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-[11px] font-medium text-[#4F4F4F] flex items-center gap-1.5">
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-[#757575] shrink-0" />
                      <span className="truncate">{sig}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Fastening Override directly in Step 1 - Clean Astra Gray Outline Pills */}
                <div className="pt-2 border-t border-[#E5E5E5] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-[#1E1E1E]">Fastening / Closure Type:</span>
                    <span className="text-[#757575] font-normal">Not all outfits use a zipper</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Back Zip (55cm)", value: "Back Invisible Zipper (55cm)" },
                      { label: "Side Zip (35cm)", value: "Side Invisible Zipper (35cm)" },
                      { label: "Front Buttons (No Zip)", value: "Front Button Placket" },
                      { label: "Pullover (No Zipper)", value: "Pullover / Slip-On (No Zipper)" },
                      { label: "Back Keyhole Button", value: "Back Keyhole & Loop Button" }
                    ].map((c) => {
                      const active = closureChoice === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => handleClosureChange(c.value)}
                          className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${
                            active ? OPTION_ACTIVE : OPTION_IDLE
                          }`}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Sizing, Silhouette & Fit Rules */}
        {currentStep === 2 && (
          <motion.div
            key="studio-step-2"
            initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
            className="space-y-6">
            
            {/* Step 2 Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-medium text-[#1E1E1E] tracking-tight font-[ClashGrotesk-medium]">
                    Size, Measurements &amp; Fit
                  </h2>
                  {isFromDesign && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F2F2F2] text-[#4F4F4F] border border-[#E0E0E0]">
                      Design Loaded
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#4F4F4F] font-normal mt-1">
                  Check the detected cloth &amp; fastening details below, pick a standard UK size or enter custom body measurements, and choose how fitted you want it.
                </p>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`px-4 py-2 text-xs flex items-center justify-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiArrowLeftLine className="w-3.5 h-3.5 text-[#757575]" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className={HIGHLIGHT_LINK_BTN}>
                  {isCalculating ? (
                    <>
                      <RiRefreshLine className="w-3.5 h-3.5 animate-spin" />
                      <span>Building Pattern...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Pattern Sheet</span>
                      <RiArrowRightLine className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Extracted Silhouette & Cuts Summary Section */}
            <div className="bg-white border border-[#E0E0E0] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#757575]" />
                  <h3 className="text-xs sm:text-sm font-medium text-[#1E1E1E] uppercase tracking-wider">
                    Detected Cloth &amp; Fastening Details
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-medium text-[#4F4F4F] bg-[#F2F2F2] px-2.5 py-0.5 rounded-full border border-[#E0E0E0]">
                    Block: {garmentBlock}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-[#4F4F4F] bg-[#F2F2F2] px-2.5 py-0.5 rounded-full border border-[#E0E0E0]">
                    {closureChoice}
                  </span>
                </div>
              </div>

              {/* Schema Breakdown Mini-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                  { label: "Outfit Type", item: analysis.garment_type },
                  { label: "Fit Style", item: analysis.silhouette },
                  { label: "Neckline", item: analysis.neckline },
                  { label: "Sleeves", item: analysis.sleeves },
                  { label: "Garment Length", item: analysis.length },
                  { label: "Fastening / Closure", item: { value: closureChoice, status: "observed" } as ObservedValue },
                  { label: "Main Fabric", item: { value: fabricChoice, status: "observed" } as ObservedValue },
                  { label: "Dominant Swatch", item: { value: `${detectedColorHex} (${detectionConfidence}% match)`, status: "observed" } as ObservedValue }
                ].map((card, idx) => {
                  const isObserved = card.item.status === "observed";
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[#E5E5E5] bg-[#F8F8F8]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#4F4F4F] font-medium truncate">{card.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border ${
                            isObserved
                              ? "bg-[#F2F2F2] text-[#4F4F4F] border-[#E0E0E0]"
                              : "bg-[#F2F2F2] text-[#757575] border-[#E0E0E0]"
                          }`}>
                          {isObserved ? "DETECTED" : "SET BELOW"}
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs font-medium text-[#1E1E1E] truncate capitalize">
                        {card.item.value || <span className="text-[#757575] text-[11px] font-normal">Selected below</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sizing & Cuts Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
              <div className="lg:col-span-7 space-y-5">
                {/* Standard Size Presets Picker */}
                <div className="p-5 rounded-2xl bg-white border border-[#E0E0E0] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#1E1E1E] uppercase tracking-wider block">
                      1. Choose a Size
                    </span>
                    <span className="text-[11px] text-[#757575] font-normal">UK Standard Sizes</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[...(Object.keys(SIZE_PRESETS) as Array<keyof typeof SIZE_PRESETS>), "Custom" as const].map((size) => {
                      const active = selectedSize === size;
                      return (
                        <motion.button
                          key={size}
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          onClick={() => handleSelectSizePreset(size)}
                          className={`relative p-2.5 rounded-xl border text-xs font-medium transition-colors duration-150 cursor-pointer ${
                            active ? "text-[#1E1E1E] border-transparent" : OPTION_IDLE
                          }`}>
                          {active && (
                            <motion.div
                              layoutId="step2-size-active"
                              transition={TACTILE_SPRING}
                              className="absolute inset-0 rounded-xl bg-[#F2F2F2] border border-[#757575] ring-1 ring-[#BDBDBD]/60 shadow-2xs pointer-events-none"
                            />
                          )}
                          <span className="relative z-10">{size}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#4F4F4F] font-normal">
                    Selected size: <strong className="text-[#1E1E1E] font-medium">{selectedSize === "Custom" ? "Custom Body Measurements" : SIZE_PRESETS[selectedSize as keyof typeof SIZE_PRESETS].label}</strong>
                  </p>
                </div>

                {/* Body Measurements Inputs */}
                <div className="p-5 rounded-2xl bg-white border border-[#E0E0E0] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-medium text-[#1E1E1E] uppercase tracking-wider">
                      2. Body Measurements ({unit === "in" ? "inches / cm" : "cm"})
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#757575] font-normal hidden sm:inline">Switch units:</span>
                      <div className="flex items-center p-0.5 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-[10px] font-mono font-medium relative">
                        {(["cm", "in"] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setUnit(u)}
                            className={`relative px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                              unit === u ? "text-[#1E1E1E]" : "text-[#757575] hover:text-[#1E1E1E]"
                            }`}>
                            {unit === u && (
                              <motion.span
                                layoutId="step2-unit-pill"
                                transition={TACTILE_SPRING}
                                className="absolute inset-0 rounded-full bg-white border border-[#D0D5DD] shadow-2xs"
                              />
                            )}
                            <span className="relative z-10">{u.toUpperCase()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-[#4F4F4F] font-medium flex items-center justify-between mb-1.5">
                        <span>Bust (cm)</span>
                        {unit === "in" && <span className="font-mono text-[10px] text-[#757575]">{fmtVal(bodyBust)}&quot;</span>}
                      </label>
                      <input
                        type="number"
                        value={bodyBust}
                        onChange={(e) => {
                          setBodyBust(Number(e.target.value));
                          setSelectedSize("Custom");
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-mono font-medium text-sm tabular-nums focus:outline-none focus:border-[#757575] focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#4F4F4F] font-medium flex items-center justify-between mb-1.5">
                        <span>Waist (cm)</span>
                        {unit === "in" && <span className="font-mono text-[10px] text-[#757575]">{fmtVal(bodyWaist)}&quot;</span>}
                      </label>
                      <input
                        type="number"
                        value={bodyWaist}
                        onChange={(e) => {
                          setBodyWaist(Number(e.target.value));
                          setSelectedSize("Custom");
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-mono font-medium text-sm tabular-nums focus:outline-none focus:border-[#757575] focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#4F4F4F] font-medium flex items-center justify-between mb-1.5">
                        <span>Hip (cm)</span>
                        {unit === "in" && <span className="font-mono text-[10px] text-[#757575]">{fmtVal(bodyHip)}&quot;</span>}
                      </label>
                      <input
                        type="number"
                        value={bodyHip}
                        onChange={(e) => {
                          setBodyHip(Number(e.target.value));
                          setSelectedSize("Custom");
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-mono font-medium text-sm tabular-nums focus:outline-none focus:border-[#757575] focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#4F4F4F] font-medium flex items-center justify-between mb-1.5">
                        <span>Length (cm)</span>
                        {unit === "in" && <span className="font-mono text-[10px] text-[#757575]">{fmtVal(bodyLength)}&quot;</span>}
                      </label>
                      <input
                        type="number"
                        value={bodyLength}
                        onChange={(e) => {
                          setBodyLength(Number(e.target.value));
                          setSelectedSize("Custom");
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-mono font-medium text-sm tabular-nums focus:outline-none focus:border-[#757575] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Garment Cut Adjustments */}
                <div className="p-5 rounded-2xl bg-white border border-[#E0E0E0] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-[#1E1E1E] uppercase tracking-wider">
                      3. Outfit Block, Fastening &amp; Fit
                    </h3>
                    <span className="text-[11px] font-mono font-medium text-[#4F4F4F] bg-[#F2F2F2] px-2.5 py-0.5 rounded-full border border-[#E0E0E0]">
                      {garmentBlock}
                    </span>
                  </div>

                  {/* Outfit Pattern Block Selector (6 Full Garment Blocks) */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#4F4F4F] font-medium block">Outfit Pattern Block (Changes the CAD Silhouette &amp; Default Fastening)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(["Sheath Dress", "A-Line Dress", "Slip Dress", "Tailored Blazer", "Button-Down Shirt", "Kaftan / Boubou"] as const).map((blk) => (
                        <button
                          key={blk}
                          type="button"
                          onClick={() => handleGarmentBlockChange(blk)}
                          className={`p-2.5 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                            garmentBlock === blk ? OPTION_ACTIVE : OPTION_IDLE
                          }`}>
                          {blk}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fastening / Closure Selector (Explicitly supports Non-Zipper Outfits!) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-[#4F4F4F] font-medium">Fastening / Closure (Draws directly on Front or Back Piece)</label>
                      <span className="text-[10px] font-mono font-medium text-[#4F4F4F] bg-[#F2F2F2] px-2.5 py-0.5 rounded-full border border-[#E0E0E0]">
                        {closureChoice.includes("No Zipper") || closureChoice.includes("Button") ? "NO ZIPPER" : "ZIPPER"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { label: "Back Invisible Zipper (55cm)", sub: "Center-back zipper track" },
                        { label: "Side Invisible Zipper (35cm)", sub: "Left side-seam zip • Back on fold" },
                        { label: "Front Button Placket", sub: "Center-front buttons • No zipper" },
                        { label: "Pullover / Slip-On (No Zipper)", sub: "Cut on fold • Zero zippers" },
                        { label: "Back Keyhole & Loop Button", sub: "Upper-back keyhole • No zipper" }
                      ].map((opt) => {
                        const isSelected = closureChoice === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleClosureChange(opt.label)}
                            className={`p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              isSelected ? OPTION_ACTIVE : OPTION_IDLE
                            }`}>
                            <div className="text-xs font-medium text-[#1E1E1E]">{opt.label}</div>
                            <div className="text-[10px] font-normal mt-0.5 text-[#757575]">
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Neckline & Sleeve Style Pickers (Live SVG Geometry) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#4F4F4F] font-medium block">Neckline Shape</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["Square", "Round", "V-Neck", "Sweetheart"] as const).map((neck) => (
                          <button
                            key={neck}
                            type="button"
                            onClick={() => handleNecklineChange(neck)}
                            className={`p-2 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              necklineCut === neck ? OPTION_ACTIVE : OPTION_IDLE
                            }`}>
                            {neck}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#4F4F4F] font-medium block">Sleeves</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Sleeveless", "Short", "Long"] as const).map((slv) => (
                          <button
                            key={slv}
                            type="button"
                            onClick={() => handleSleeveChange(slv)}
                            className={`p-2 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              sleeveCut === slv ? OPTION_ACTIVE : OPTION_IDLE
                            }`}>
                            {slv}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-[#757575] font-normal">
                        {sleeveCut === "Sleeveless"
                          ? "Sleeveless bodice with armhole facing"
                          : `Adds a ${sleeveCut.toLowerCase()} sleeve pattern piece`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hem Cut */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#4F4F4F] font-medium block">Length Preset</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Mini", "Midi", "Maxi"] as const).map((cut) => (
                          <button
                            key={cut}
                            type="button"
                            onClick={() => handleHemCutChange(cut)}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              hemCut === cut ? OPTION_ACTIVE : OPTION_IDLE
                            }`}>
                            {cut}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Silhouette Fit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[#4F4F4F] font-medium">How Should It Fit?</label>
                        <span className="text-[10px] text-[#757575] font-normal">Comfort Room</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Fitted", "Semi-Fitted", "Relaxed"] as const).map((fit) => (
                          <button
                            key={fit}
                            type="button"
                            onClick={() => handleSilhouetteFitChange(fit)}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              silhouetteFit === fit ? OPTION_ACTIVE : OPTION_IDLE
                            }`}>
                            {fit}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fabric Choice */}
                  <div className="pt-3 border-t border-[#E5E5E5] space-y-1.5">
                    <label className="text-xs text-[#4F4F4F] font-medium block">Main Recommended Fabric</label>
                    <select
                      value={fabricChoice}
                      onChange={(e) => setFabricChoice(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-medium text-xs focus:bg-white focus:outline-none focus:border-[#757575] cursor-pointer">
                      <option>100% Woven Cotton Poplin (Non-stretch)</option>
                      <option>Ankara Wax Print / Silk Damask</option>
                      <option>Linen Blend (Low stretch)</option>
                      <option>Wool Crepe (Tailored)</option>
                      <option>Silk Crepe de Chine (Fluid)</option>
                    </select>
                  </div>
                </div>

                {/* Bottom Guided Navigation Bar for Step 2 */}
                <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className={`w-full sm:w-auto px-5 py-2.5 text-xs flex items-center justify-center gap-2 ${SECONDARY_PILL_BTN}`}>
                    <RiArrowLeftLine className="w-3.5 h-3.5 text-[#757575]" />
                    Back to Step 1
                  </button>

                  <button
                    type="button"
                    onClick={handleCalculate}
                    disabled={isCalculating}
                    className={`w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 ${PRIMARY_PILL_BTN}`}>
                    {isCalculating ? (
                      <>
                        <RiRefreshLine className="w-4 h-4 animate-spin" />
                        Building Pattern for {selectedSize}...
                      </>
                    ) : (
                      <>
                        <RiRuler2Line className="w-4 h-4" />
                        Create Pattern &amp; Tailor Sheet &rarr;
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Card & Fit Rules Inspector (Right Column) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-[#E0E0E0] rounded-2xl p-4 sm:p-6 space-y-4 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs">
                  <div className="relative w-full max-w-[260px] sm:max-w-xs aspect-[3/4] rounded-2xl overflow-hidden border border-[#E0E0E0] shadow-xs">
                    <img src={selectedSample} alt="Design Preview" className="object-cover w-full h-full" />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-md border border-[#E0E0E0] rounded-full text-[10px] font-mono font-medium text-[#1E1E1E] shadow-sm">
                      {isFromDesign ? "Imported Design" : "Selected Style"}
                    </div>
                  </div>
                  <div className="w-full text-center space-y-1">
                    <h4 className="text-xs font-medium text-[#1E1E1E]">Selected Style: {garmentBlock}</h4>
                    <p className="text-xs text-[#4F4F4F] font-normal">
                      Size <strong className="text-[#1E1E1E] font-medium">{selectedSize}</strong> &bull; <strong className="text-[#1E1E1E] font-medium">{hemCut}</strong> length
                    </p>
                  </div>
                </div>

                {/* Fit Rules Inspector */}
                <div className="bg-white border border-[#E0E0E0] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#1E1E1E] font-medium text-xs">
                      <RiEqualizerLine className="w-4 h-4 text-[#757575]" />
                      Comfort Room (Breathing Allowance)
                    </div>
                    <span className="text-[10px] bg-[#F2F2F2] text-[#4F4F4F] border border-[#E0E0E0] px-2.5 py-0.5 rounded-full font-mono font-medium">
                      {silhouetteFit}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                    Extra room added to the body measurements so the finished outfit is comfortable to wear and move in:
                  </p>
                  <div className="space-y-2 text-xs font-mono tabular-nums">
                    <div className="p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] flex justify-between">
                      <span className="text-[#4F4F4F] font-sans font-medium">Bust Comfort Room:</span>
                      <span className="text-[#1E1E1E] font-medium">+{fmtUnit(easeValues.bust)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] flex justify-between">
                      <span className="text-[#4F4F4F] font-sans font-medium">Waist Comfort Room:</span>
                      <span className="text-[#1E1E1E] font-medium">+{fmtUnit(easeValues.waist)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] flex justify-between">
                      <span className="text-[#4F4F4F] font-sans font-medium">Hip Comfort Room:</span>
                      <span className="text-[#1E1E1E] font-medium">+{fmtUnit(easeValues.hip)}</span>
                    </div>
                  </div>
                </div>

                {/* Fabric Yardage Calculator Card - Astra Gray Style */}
                <div className="bg-white border border-[#E0E0E0] rounded-2xl p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-xs text-[#1E1E1E]">
                      <RiScissors2Line className="w-4 h-4 text-[#757575]" />
                      How Much Fabric to Buy
                    </div>
                    <span className="text-[10px] bg-[#F2F2F2] text-[#4F4F4F] px-2.5 py-0.5 rounded-full font-mono font-medium border border-[#E0E0E0]">
                      {selectedSize} · {hemCut}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                    Estimated fabric yardage for <strong className="text-[#1E1E1E] font-medium">{necklineCut}</strong> neck, <strong className="text-[#1E1E1E] font-medium">{sleeveCut}</strong> sleeves, and <strong className="text-[#1E1E1E] font-medium">{hemCut}</strong> length (includes seam &amp; hem allowances):
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                    <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                      <span className="text-[10px] text-[#757575] font-sans font-medium uppercase block">60&quot; Wide Roll (150cm)</span>
                      <motion.strong
                        key={`y60-${fabricYardage.yards60}-${fabricYardage.meters60}`}
                        initial={{ opacity: 0.45, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                        className="text-sm text-[#1E1E1E] font-medium mt-0.5 block">
                        {fabricYardage.yards60} yds ({fabricYardage.meters60} m)
                      </motion.strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                      <span className="text-[10px] text-[#757575] font-sans font-medium uppercase block">45&quot; Wide / Ankara</span>
                      <motion.strong
                        key={`y45-${fabricYardage.yards45}-${fabricYardage.meters45}`}
                        initial={{ opacity: 0.45, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                        className="text-sm text-[#1E1E1E] font-medium mt-0.5 block">
                        {fabricYardage.yards45} yds ({fabricYardage.meters45} m)
                      </motion.strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Blueprint Tailor Pack & SVG Technical Drawing */}
        {currentStep === 3 && (
          <motion.div
            key="studio-step-3"
            initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
            transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
            className="space-y-5">

            {/* Master Header Card & Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-white border border-[#E0E0E0]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-medium text-[#1E1E1E] tracking-tight font-[ClashGrotesk-medium]">
                    Pattern &amp; Tailor Sheet
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#F2F2F2] text-[#4F4F4F] border border-[#E0E0E0]">
                    Size: {selectedSize} &bull; v{versionNumber}.0
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-[#F2F2F2] text-[#4F4F4F] border border-[#E0E0E0]">
                    <span className={`w-1.5 h-1.5 rounded-full ${versionStatus === "Approved for Sampling" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {versionStatus}
                  </span>
                </div>
                <p className="text-xs text-[#4F4F4F] font-normal">
                  {approvedTimestamp
                    ? `Approved on ${approvedTimestamp} — Ready for your tailor.`
                    : `Sized for ${selectedSize} · ${hemCut} length (${bodyLength} cm) · Ready to print or send to your tailor.`}
                </p>
              </div>

              {/* Action Toolbar - Secondary Outline Pills + Single Primary Pill CTA */}
              <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                <button
                  onClick={() => setShowUploadModal(true)}
                  title="Upload a different outfit photo"
                  className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiUploadCloud2Line className="w-3.5 h-3.5 text-[#757575]" />
                  Change Photo
                </button>

                <button
                  onClick={() => setShowTailorModal(true)}
                  className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiScissors2Line className="w-3.5 h-3.5 text-[#757575]" />
                  Adjust Fit
                </button>

                <button
                  onClick={handleDownloadSVG}
                  title="Download SVG pattern file"
                  className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiFileCodeLine className="w-3.5 h-3.5 text-[#757575]" />
                  Download SVG
                </button>

                <button
                  onClick={() => handleShareWithTailor("copy")}
                  title="Copy full measurement & fabric summary to clipboard"
                  className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiFileTextLine className="w-3.5 h-3.5 text-[#757575]" />
                  Copy Summary
                </button>

                <button
                  onClick={() => handleShareWithTailor("whatsapp")}
                  title="Send pattern measurements & fabric yardage to your tailor on WhatsApp"
                  className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiSendPlaneLine className="w-3.5 h-3.5 text-[#757575]" />
                  Send to WhatsApp
                </button>

                {versionStatus === "Draft" ? (
                  <button
                    onClick={handleApprove}
                    className={`px-3.5 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                    <RiCheckboxCircleLine className="w-3.5 h-3.5 text-[#757575]" />
                    Approve Pattern
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3.5 py-2 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-xs font-medium text-[#757575] flex items-center gap-1.5 cursor-not-allowed">
                    <RiLockLine className="w-3.5 h-3.5" />
                    Approved
                  </button>
                )}

                {/* Primary Pill CTA Button Only */}
                <button
                  onClick={handleExportPDF}
                  className={`px-5 py-2 text-xs flex items-center gap-1.5 ${PRIMARY_PILL_BTN}`}>
                  <RiPrinterLine className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>
            </div>

            {/* Active Design Reference Dock */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E0E0E0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-[#E0E0E0] bg-[#F8F8F8] flex-shrink-0 relative">
                  <img src={selectedSample} alt="Design Reference" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-[#1E1E1E] truncate max-w-[220px] sm:max-w-[260px]">
                      {uploadedFileName ? uploadedFileName : `Selected Style: ${garmentBlock}`}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F2F2F2] text-[#4F4F4F] border border-[#E0E0E0]">
                      {uploadedFileName ? `Uploaded (${uploadedFileSize})` : "Studio Style"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4F4F4F] font-normal mt-0.5 truncate sm:whitespace-normal">
                    All pattern pieces, seam allowances, and measurements below are sized for {selectedSize} ({silhouetteFit}).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className={`flex-1 sm:flex-none justify-center px-4 py-2 text-xs flex items-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiUploadCloud2Line className="w-3.5 h-3.5 text-[#757575]" />
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-full bg-[#F2F2F2] hover:bg-[#E5E5E5] border border-[#BDBDBD] text-[#1E1E1E] text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-2xs">
                  <RiEqualizerLine className="w-3.5 h-3.5 text-[#4F4F4F]" />
                  Edit Size &amp; Fit
                </button>
              </div>
            </div>

            {/* Sub-tab Navigation (Sliding Indicator + Horizontal Scroll on Mobile) */}
            <div className="flex border-b border-[#E5E5E5] gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5 -mx-1 px-1">
              {[
                { id: "flats", label: "Pattern Drawing", icon: RiFileTextLine },
                { id: "measurements", label: `Measurements (${selectedSize})`, icon: RiRuler2Line },
                { id: "assembly", label: `Sewing Steps (${completedSteps.length}/6)`, icon: RiCheckboxLine },
                { id: "history", label: `Fit Changes (${corrections.length})`, icon: RiHistoryLine }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = blueprintTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setBlueprintTab(tab.id as any)}
                    className={`relative flex-shrink-0 px-3.5 sm:px-4 py-2.5 text-xs flex items-center gap-2 transition-colors duration-150 cursor-pointer rounded-t-xl ${
                      isActive
                        ? "text-[#1E1E1E] font-medium bg-[#F8F8F8]"
                        : "text-[#757575] font-normal hover:text-[#1E1E1E] hover:bg-[#FAFAFA]"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="blueprint-subtab-underline"
                        transition={TACTILE_SPRING}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4F4F4F] rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
            {/* TAB 1: Parametric Technical Drawing Canvas */}
            {blueprintTab === "flats" && (() => {
              // Dynamic Parametric Calculations for SVG Flat Pattern (1:10 scale, 1 unit = 2mm)
              const finBust = bodyBust + easeValues.bust;
              const finWaist = bodyWaist + easeValues.waist;
              const finHip = bodyHip + easeValues.hip;
              const finLength = bodyLength + easeValues.length;

              // Dynamic hem level Y based on garmentBlock and hemCut
              const isBlazer = garmentBlock === "Tailored Blazer";
              const isALine = garmentBlock === "A-Line Dress";
              const isSlip = garmentBlock === "Slip Dress";

              const hemY = isBlazer
                ? 330
                : hemCut === "Mini"
                ? 375
                : hemCut === "Maxi"
                ? 510
                : 450;

              // Dynamic half-widths scaled around baseline UK 12 (Bust 96, Waist 77, Hip 102.5)
              const bustHalfW = Math.round(66 + (finBust - 96) * 0.45);
              const waistHalfW = Math.round((isBlazer ? 54 : 47) + (finWaist - 77) * 0.42);
              const hipHalfW = Math.round(59 + (finHip - 102.5) * 0.45);
              const hemHalfW = Math.round(
                isBlazer
                  ? hipHalfW + 2
                  : isALine
                  ? hipHalfW + 36
                  : hemCut === "Maxi"
                  ? hipHalfW + 15
                  : hemCut === "Mini"
                  ? hipHalfW - 2
                  : hipHalfW + 6
              );

              // Dynamic Neckline Closure Path based on necklineCut & garmentBlock
              const frontNeckClosure = isBlazer
                ? "L 18 36 L 34 62 L 0 124 L -34 62 L -18 36 L -28 44"
                : necklineCut === "Round"
                ? "Q 0 98 -28 44"
                : necklineCut === "V-Neck"
                ? "L 0 112 L -28 44"
                : necklineCut === "Sweetheart"
                ? "C 18 72, 6 102, 0 108 C -6 102, -18 72, -28 44"
                : "L 28 90 L -28 90 L -28 44";

              const frontNeckFacingPath = isBlazer
                ? "M -36 46 L -38 72 L 0 134 L 38 72 L 36 46"
                : necklineCut === "Round"
                ? "M -34 48 Q 0 112 34 48"
                : necklineCut === "V-Neck"
                ? "M -34 48 L 0 124 L 34 48"
                : necklineCut === "Sweetheart"
                ? "M -34 48 C -20 82, -8 112, 0 120 C 8 112, 20 82, 34 48"
                : "M -34 48 L -34 98 L 34 98 L 34 48";

              const shoulderLeft = isSlip ? "M -24 32 L -28 62" : isBlazer ? "M -26 40 L -50 52" : "M -28 44 L -44 54";
              const shoulderRight = isSlip ? "L 28 62 L 24 32" : isBlazer ? "L 50 52 L 26 40" : "L 44 54 L 28 44";

              // True Cubic-Bezier Anatomical Stitch Paths (Front & Back)
              const frontContourPath = [
                shoulderLeft,
                `C -40 84, -${bustHalfW - 8} 110, -${bustHalfW} 126`,
                `C -${bustHalfW - 2} 164, -${waistHalfW + 3} 195, -${waistHalfW} 220`,
                isALine
                  ? `Q -${hipHalfW + 10} 290 -${hemHalfW} ${hemY}`
                  : `C -${waistHalfW + 4} 252, -${hipHalfW - 2} 280, -${hipHalfW} 312 L -${hemHalfW} ${hemY}`,
                `Q 0 ${hemY + (isALine ? 14 : 7)} ${hemHalfW} ${hemY}`,
                isALine
                  ? `Q ${hipHalfW + 10} 290 ${waistHalfW} 220`
                  : `L ${hipHalfW} 312 C ${hipHalfW - 2} 280, ${waistHalfW + 4} 252, ${waistHalfW} 220`,
                `C ${waistHalfW + 3} 195, ${bustHalfW - 2} 164, ${bustHalfW} 126`,
                `C ${bustHalfW - 8} 110, 40 84, ${isSlip ? "28 62" : isBlazer ? "50 52" : "44 54"}`,
                shoulderRight,
                frontNeckClosure,
                `Z`
              ].join(" ");

              const backContourPath = [
                shoulderLeft,
                `C -40 84, -${bustHalfW - 8} 110, -${bustHalfW} 126`,
                `C -${bustHalfW - 2} 164, -${waistHalfW + 3} 195, -${waistHalfW} 220`,
                isALine
                  ? `Q -${hipHalfW + 10} 290 -${hemHalfW} ${hemY}`
                  : `C -${waistHalfW + 4} 252, -${hipHalfW - 2} 280, -${hipHalfW} 312 L -${hemHalfW} ${hemY}`,
                `Q 0 ${hemY + (isALine ? 12 : 6)} ${hemHalfW} ${hemY}`,
                isALine
                  ? `Q ${hipHalfW + 10} 290 ${waistHalfW} 220`
                  : `L ${hipHalfW} 312 C ${hipHalfW - 2} 280, ${waistHalfW + 4} 252, ${waistHalfW} 220`,
                `C ${waistHalfW + 3} 195, ${bustHalfW - 2} 164, ${bustHalfW} 126`,
                `C ${bustHalfW - 8} 110, 40 84, ${isSlip ? "28 62" : isBlazer ? "50 52" : "44 54"}`,
                shoulderRight,
                `Q 0 58 -28 44`,
                `Z`
              ].join(" ");

              // Zipper termination Y (ends around waist + 70px)
              const zipperEndY = Math.min(hemY - 40, 290);

              const getLayerOpacity = (layer: "silhouette" | "seams" | "zipper" | "darts" | "hem") => {
                if (inspectedLayer === "all") return 1;
                return inspectedLayer === layer ? 1 : 0.18;
              };

              const layerButtons: Array<{
                id: "all" | "silhouette" | "seams" | "zipper" | "darts" | "hem";
                label: string;
                badge: string;
              }> = [
                { id: "all", label: "Full Pattern", badge: "All lines" },
                { id: "silhouette", label: "Cut & Stitch Lines", badge: "1.5cm seam" },
                { id: "seams", label: "Neck & Armholes", badge: "Facing" },
                {
                  id: "zipper",
                  label: closureChoice.includes("No Zipper")
                    ? "Fold / No Zip"
                    : closureChoice.includes("Button")
                    ? "Button Placket"
                    : "Fastening",
                  badge: closureChoice.includes("No Zipper")
                    ? "Fold line"
                    : closureChoice.includes("Button")
                    ? "Buttons"
                    : "55cm zip"
                },
                { id: "darts", label: "Shaping Darts", badge: "Bust & waist" },
                { id: "hem", label: `${hemCut} Hemline`, badge: `${finLength.toFixed(0)}cm` }
              ];

              return (
                <motion.div
                  key="blueprint-tab-flats"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                  className="space-y-5">
                  {/* Canvas Toolbar & Quick Status */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E0E0E0] text-xs">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[#4F4F4F] text-[11px] sm:text-xs font-normal tabular-nums">
                      <span className="font-medium text-[#1E1E1E] flex items-center gap-1.5">
                        <RiCompasses2Line className="w-4 h-4 text-[#757575]" />
                        Scale 1:10
                      </span>
                      <span className="text-[#E0E0E0]">|</span>
                      <span>Size: <strong className="text-[#1E1E1E] font-medium">{selectedSize}</strong></span>
                      <span className="text-[#E0E0E0]">|</span>
                      <span>Length: <strong className="text-[#1E1E1E] font-medium">{hemCut}</strong></span>
                      <span className="text-[#E0E0E0] hidden sm:inline">|</span>
                      <span className="hidden sm:inline">Bust: <strong className="text-[#1E1E1E] font-mono font-medium">{finBust.toFixed(1)}cm</strong></span>
                      <span className="text-[#E0E0E0] hidden sm:inline">|</span>
                      <span className="hidden sm:inline">Waist: <strong className="text-[#1E1E1E] font-mono font-medium">{finWaist.toFixed(1)}cm</strong></span>
                      <span className="text-[#E0E0E0] hidden sm:inline">|</span>
                      <span className="hidden sm:inline">Hip: <strong className="text-[#1E1E1E] font-mono font-medium">{finHip.toFixed(1)}cm</strong></span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-[#F2F2F2]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowCallouts(!showCallouts)}
                          className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                            showCallouts ? OPTION_ACTIVE : OPTION_IDLE
                          }`}>
                          Labels: {showCallouts ? "ON" : "OFF"}
                        </button>

                        <button
                          onClick={() => setShowDarts(!showDarts)}
                          className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                            showDarts ? OPTION_ACTIVE : OPTION_IDLE
                          }`}>
                          Darts: {showDarts ? "ON" : "OFF"}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSvgZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                          title="Zoom Out"
                          className="p-1.5 rounded-full bg-white hover:bg-[#F5F5F5] border border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F] transition-colors cursor-pointer">
                          <RiZoomOutLine className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-[11px] text-[#1E1E1E] w-10 text-center font-medium tabular-nums">
                          {(svgZoom * 100).toFixed(0)}%
                        </span>
                        <button
                          onClick={() => setSvgZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                          title="Zoom In"
                          className="p-1.5 rounded-full bg-white hover:bg-[#F5F5F5] border border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F] transition-colors cursor-pointer">
                          <RiZoomInLine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSvgZoom(1)}
                          title="Reset Zoom"
                          className="p-1.5 rounded-full bg-white hover:bg-[#F5F5F5] border border-[#E0E0E0] hover:border-[#BDBDBD] text-[#4F4F4F] transition-colors cursor-pointer">
                          <RiFullscreenLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive CAD Layer Inspector Chips */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E0E0E0] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiStackLine className="w-4 h-4 text-[#757575]" />
                        <span className="text-xs font-medium text-[#1E1E1E]">Highlight Pattern Parts</span>
                        <span className="text-[11px] text-[#757575] font-normal hidden sm:inline">Click any part below to focus on it</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#4F4F4F] uppercase tracking-wider bg-[#F2F2F2] px-2.5 py-0.5 rounded-full border border-[#E0E0E0] font-medium">
                        VIEW: {inspectedLayer === "all" ? "ALL PARTS" : inspectedLayer.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {layerButtons.map((btn) => {
                        const isSelected = inspectedLayer === btn.id;
                        return (
                          <motion.button
                            key={btn.id}
                            type="button"
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ duration: 0.14 }}
                            onClick={() => setInspectedLayer(btn.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 transition-colors duration-150 cursor-pointer ${
                              isSelected ? OPTION_ACTIVE : OPTION_IDLE
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${isSelected ? "bg-emerald-500" : "bg-[#BDBDBD]"}`} />
                            <span>{btn.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono hidden sm:inline ${isSelected ? "bg-[#E5E5E5] text-[#1E1E1E]" : "bg-[#F2F2F2] text-[#757575]"}`}>
                              {btn.badge}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Contextual Layer Guidance Banner + Inline Quick-Tweak Controls */}
                    <AnimatePresence>
                    {inspectedLayer !== "all" && (
                      <motion.div
                        key={`guidance-${inspectedLayer}`}
                        initial={{ opacity: 0, y: -6, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.99 }}
                        transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                        className="mt-2 p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#4F4F4F] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-start gap-2.5">
                          <RiInformationLine className="w-4 h-4 text-[#757575] shrink-0 mt-0.5" />
                          <div className="text-xs text-[#4F4F4F] font-normal">
                            {inspectedLayer === "silhouette" && (
                              <p>
                                <strong className="text-[#1E1E1E] font-medium">Cut &amp; Stitch Lines:</strong> Solid line = stitching line (Bust {fmtUnit(finBust)}, Waist {fmtUnit(finWaist)}, Hip {fmtUnit(finHip)}). Outer dashed line = +1.5 cm cutting allowance.
                              </p>
                            )}
                            {inspectedLayer === "seams" && (
                              <p>
                                <strong className="text-[#1E1E1E] font-medium">Neckline &amp; Sleeves:</strong> {necklineCut} neckline with 4.5 cm facing and {sleeveCut.toLowerCase()} armhole setup.
                              </p>
                            )}
                            {inspectedLayer === "zipper" && (
                              <p>
                                <strong className="text-[#1E1E1E] font-medium">Fastening / Closure:</strong> {closureChoice}. {closureChoice.includes("No Zipper") ? "Back cut on fold, zero zippers required." : closureChoice.includes("Button") ? "Front placket closure, back regular seam." : "55 cm invisible zipper down center-back with 1.5 cm seam allowance."}
                              </p>
                            )}
                            {inspectedLayer === "darts" && (
                              <p>
                                <strong className="text-[#1E1E1E] font-medium">Shaping Darts:</strong> Side bust darts and front/back waist darts contour the dress smoothly around the body.
                              </p>
                            )}
                            {inspectedLayer === "hem" && (
                              <p>
                                <strong className="text-[#1E1E1E] font-medium">Hemline:</strong> {hemCut} length ({fmtUnit(finLength)}) with an extra 4.0 cm fold at the bottom for hemming.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick-Tweak Controls directly inside the banner */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {inspectedLayer === "seams" &&
                            (["Square", "Round", "V-Neck", "Sweetheart"] as const).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handleNecklineChange(n)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border cursor-pointer transition-colors ${
                                  necklineCut === n ? OPTION_ACTIVE : OPTION_IDLE
                                }`}>
                                {n}
                              </button>
                            ))}
                          {inspectedLayer === "hem" &&
                            (["Mini", "Midi", "Maxi"] as const).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleHemCutChange(c)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border cursor-pointer transition-colors ${
                                  hemCut === c ? OPTION_ACTIVE : OPTION_IDLE
                                }`}>
                                {c}
                              </button>
                            ))}
                          {inspectedLayer === "silhouette" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustEase("waist", -0.5)}
                                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white text-[#4F4F4F] border border-[#E0E0E0] hover:border-[#BDBDBD] cursor-pointer">
                                Waist -0.5cm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustEase("waist", 0.5)}
                                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white text-[#4F4F4F] border border-[#E0E0E0] hover:border-[#BDBDBD] cursor-pointer">
                                Waist +0.5cm
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setInspectedLayer("all")}
                            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#E5E5E5] hover:bg-[#D0D5DD] text-[#1E1E1E] cursor-pointer">
                            Show All
                          </button>
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>

                  {/* Technical Drawing Canvas */}
                  <div className="w-full bg-white border border-[#E0E0E0] rounded-2xl p-3 sm:p-6 flex flex-col items-center justify-center overflow-x-auto relative shadow-2xs">
                    <div
                      style={{
                        transform: `scale(${svgZoom})`,
                        transformOrigin: "center top",
                        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                      className="w-full flex justify-center">
                      <svg
                        ref={svgRef}
                        viewBox="0 0 920 620"
                        className="w-full min-w-[560px] sm:min-w-0 max-w-4xl h-auto select-none"
                        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {/* Architectural CAD Grid & Definitions */}
                        <defs>
                          <pattern id="minorGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                            <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#f2f2f2" strokeWidth="0.8" />
                          </pattern>
                          <pattern id="majorGrid" width="75" height="75" patternUnits="userSpaceOnUse">
                            <rect width="75" height="75" fill="url(#minorGrid)" />
                            <path d="M 75 0 L 0 0 0 75" fill="none" stroke="#e5e5e5" strokeWidth="1.1" />
                          </pattern>
                        </defs>

                        {/* Blueprint Sheet Background & Border */}
                        <rect width="920" height="620" rx="8" fill="#ffffff" />
                        <rect x="8" y="8" width="904" height="604" rx="4" fill="url(#majorGrid)" stroke="#e0e0e0" strokeWidth="1" />

                        {/* Top CAD Title Bar inside SVG - Astra Gray Architectural Style */}
                        <rect x="8" y="8" width="904" height="32" fill="#fafafa" stroke="#e5e5e5" strokeWidth="1" />
                        <text x="24" y="28" fill="#333333" fontSize="10.5" fontWeight="500" letterSpacing="1.1">
                          ASTRA PATTERN SHEET // {garmentBlock.toUpperCase()} ({necklineCut.toUpperCase()} · {sleeveCut.toUpperCase()}) // SCALE 1:10
                        </text>
                        <text x="896" y="28" fill="#757575" fontSize="10" fontWeight="500" textAnchor="end">
                          SIZE: {selectedSize} ({silhouetteFit.toUpperCase()}) · VERSION v{versionNumber}.0
                        </text>

                        {/* Center Divider Line */}
                        <line x1="460" y1="40" x2="460" y2="575" stroke="#d0d5dd" strokeWidth="1" strokeDasharray="6 6" />

                        {/* ===== FRONT VIEW ===== */}
                        <motion.g
                          key={`front-${garmentBlock}-${necklineCut}`}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.26, ease: EDITORIAL_EASE }}
                          transform="translate(235, 52)">
                          <rect x="-95" y="0" width="190" height="22" rx="11" fill="#f2f2f2" stroke="#e0e0e0" strokeWidth="1" />
                          <text x="0" y="15" fill="#333333" fontSize="10.5" textAnchor="middle" fontWeight="500" letterSpacing="0.8">
                            FRONT PIECE ({selectedSize})
                          </text>

                          {/* Outer Seam Allowance Cutting Line (1.5cm offset) & Net Silhouette */}
                          <g
                            opacity={getLayerOpacity("silhouette")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "silhouette" ? "all" : "silhouette")}
                            className="cursor-pointer">
                            {/* Seam Allowance Dashed Cut Boundary */}
                            <path
                              d={frontContourPath}
                              transform="scale(1.06, 1.022) translate(0, -4)"
                              fill="rgba(79, 79, 79, 0.02)"
                              stroke="#757575"
                              strokeWidth="1.2"
                              strokeDasharray="5 3"
                              strokeLinejoin="round"
                            />
                            {/* Net Stitch Silhouette */}
                            <path
                              d={frontContourPath}
                              fill="#ffffff"
                              stroke="#333333"
                              strokeWidth={inspectedLayer === "silhouette" ? "3" : "2.1"}
                              strokeLinejoin="round"
                            />
                            {/* Pattern Cutter Seam Notches (T-ticks at Bust, Waist, Hip) */}
                            <line x1={-bustHalfW - 4} y1="126" x2={-bustHalfW + 3} y2="126" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={bustHalfW - 3} y1="126" x2={bustHalfW + 4} y2="126" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={-waistHalfW - 4} y1="220" x2={-waistHalfW + 3} y2="220" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={waistHalfW - 3} y1="220" x2={waistHalfW + 4} y2="220" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={-hipHalfW - 4} y1="312" x2={-hipHalfW + 3} y2="312" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={hipHalfW - 3} y1="312" x2={hipHalfW + 4} y2="312" stroke="#4f4f4f" strokeWidth="1.6" />
                          </g>

                          {/* Neckline Facing, Shoulder Seam & Armscye Pitch Notches */}
                          <g
                            opacity={getLayerOpacity("seams")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "seams" ? "all" : "seams")}
                            className="cursor-pointer">
                            {/* Shaped Neckline Facing Boundary */}
                            <path
                              d={frontNeckFacingPath}
                              fill="none"
                              stroke="#757575"
                              strokeDasharray="3 2"
                              strokeWidth={inspectedLayer === "seams" ? "1.8" : "1.1"}
                            />
                            {/* Armscye Single Pitch Notches (Front) */}
                            <line x1="-43" y1="88" x2="-37" y2="90" stroke="#4f4f4f" strokeWidth="1.5" />
                            <line x1="43" y1="88" x2="37" y2="90" stroke="#4f4f4f" strokeWidth="1.5" />

                            {/* Block-Specific CAD Details */}
                            {isBlazer && (
                              <>
                                {/* Notched Lapel Roll Lines & Front Button Placket */}
                                <path d="M -26 40 L 0 124 L 26 40" fill="none" stroke="#4f4f4f" strokeWidth="1.4" strokeDasharray="4 2" />
                                <line x1="0" y1="124" x2="0" y2={hemY} stroke="#4f4f4f" strokeWidth="1.6" />
                                <circle cx="0" cy="175" r="3.5" fill="#4f4f4f" />
                                <circle cx="0" cy="225" r="3.5" fill="#4f4f4f" />
                                {/* Hip Welt Pockets */}
                                <rect x="-46" y="258" width="28" height="6" rx="1" fill="#ffffff" stroke="#4f4f4f" strokeWidth="1.3" />
                                <rect x="18" y="258" width="28" height="6" rx="1" fill="#ffffff" stroke="#4f4f4f" strokeWidth="1.3" />
                              </>
                            )}
                            {isALine && (
                              <>
                                {/* A-Line Skirt Flare Slash Lines */}
                                <line x1="-24" y1="220" x2={-hemHalfW + 18} y2={hemY} stroke="#757575" strokeWidth="1" strokeDasharray="5 3" />
                                <line x1="24" y1="220" x2={hemHalfW - 18} y2={hemY} stroke="#757575" strokeWidth="1" strokeDasharray="5 3" />
                              </>
                            )}
                            {isSlip && (
                              <>
                                {/* Delicate Spaghetti Straps */}
                                <line x1="-24" y1="20" x2="-24" y2="54" stroke="#333333" strokeWidth="2.1" />
                                <line x1="24" y1="20" x2="24" y2="54" stroke="#333333" strokeWidth="2.1" />
                              </>
                            )}
                          </g>

                          {/* Internal Construction Axes & Grainline */}
                          <g opacity={inspectedLayer === "all" || inspectedLayer === "silhouette" ? 1 : 0.25}>
                            {/* Center Front Fold Line */}
                            <line x1="0" y1="90" x2="0" y2={hemY + 3} stroke="#757575" strokeDasharray="8 3 2 3" strokeWidth="1" />
                            <text x="4" y="108" fill="#4f4f4f" fontSize="8.5" fontWeight="500">CF FOLD</text>

                            {/* Horizontal Anatomical Balance Lines */}
                            <line x1={-bustHalfW} y1="126" x2={bustHalfW} y2="126" stroke="#bdbdbd" strokeDasharray="3 3" strokeWidth="1" />
                            <line x1={-waistHalfW} y1="220" x2={waistHalfW} y2="220" stroke="#757575" strokeDasharray="4 3" strokeWidth="1.2" />
                            <line x1={-hipHalfW} y1="312" x2={hipHalfW} y2="312" stroke="#bdbdbd" strokeDasharray="3 3" strokeWidth="1" />

                            {/* Vertical Grainline Vector */}
                            <line x1="-38" y1="155" x2="-38" y2={hemY - 45} stroke="#4f4f4f" strokeWidth="1.2" />
                            <polygon points="-38,148 -41.5,157 -34.5,157" fill="#4f4f4f" />
                            <polygon points={`-38,${hemY - 38} -41.5,${hemY - 47} -34.5,${hemY - 47}`} fill="#4f4f4f" />
                            <text
                              x="-43"
                              y={(155 + hemY - 45) / 2}
                              fill="#4f4f4f"
                              fontSize="8.5"
                              fontWeight="500"
                              textAnchor="middle"
                              transform={`rotate(-90 -43 ${(155 + hemY - 45) / 2})`}>
                              GRAINLINE // SELVEDGE
                            </text>
                          </g>

                          {/* Front Bust Darts, Apex Targets & Diamond Waist Suppression Darts */}
                          {showDarts && (
                            <g
                              opacity={getLayerOpacity("darts")}
                              style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                              onClick={() => setInspectedLayer(inspectedLayer === "darts" ? "all" : "darts")}
                              className="cursor-pointer">
                              {/* Bust Apex Drill Targets */}
                              <circle cx="-24" cy="132" r="4.5" fill="none" stroke="#4f4f4f" strokeWidth="1.2" />
                              <line x1="-29" y1="132" x2="-19" y2="132" stroke="#4f4f4f" strokeWidth="1" />
                              <line x1="-24" y1="127" x2="-24" y2="137" stroke="#4f4f4f" strokeWidth="1" />

                              <circle cx="24" cy="132" r="4.5" fill="none" stroke="#4f4f4f" strokeWidth="1.2" />
                              <line x1="19" y1="132" x2="29" y2="132" stroke="#4f4f4f" strokeWidth="1" />
                              <line x1="24" y1="127" x2="24" y2="137" stroke="#4f4f4f" strokeWidth="1" />

                              {/* Side Bust Dart Legs */}
                              <path
                                d={`M -${bustHalfW - 1} 144 L -29 134 L -${bustHalfW - 2} 158`}
                                fill="rgba(79,79,79,0.06)"
                                stroke="#4f4f4f"
                                strokeWidth={inspectedLayer === "darts" ? "1.8" : "1.2"}
                              />
                              <path
                                d={`M ${bustHalfW - 1} 144 L 29 134 L ${bustHalfW - 2} 158`}
                                fill="rgba(79,79,79,0.06)"
                                stroke="#4f4f4f"
                                strokeWidth={inspectedLayer === "darts" ? "1.8" : "1.2"}
                              />

                              {/* Diamond Waist Suppression Darts */}
                              <path
                                d="M -24 152 L -18.5 220 L -24 282 L -29.5 220 Z"
                                fill={inspectedLayer === "darts" ? "rgba(79,79,79,0.16)" : "rgba(79,79,79,0.06)"}
                                stroke="#4f4f4f"
                                strokeWidth={inspectedLayer === "darts" ? "2" : "1.3"}
                              />
                              <line x1="-24" y1="152" x2="-24" y2="282" stroke="#757575" strokeWidth="0.8" strokeDasharray="2 2" />

                              <path
                                d="M 24 152 L 29.5 220 L 24 282 L 18.5 220 Z"
                                fill={inspectedLayer === "darts" ? "rgba(79,79,79,0.16)" : "rgba(79,79,79,0.06)"}
                                stroke="#4f4f4f"
                                strokeWidth={inspectedLayer === "darts" ? "2" : "1.3"}
                              />
                              <line x1="24" y1="152" x2="24" y2="282" stroke="#757575" strokeWidth="0.8" strokeDasharray="2 2" />
                            </g>
                          )}

                          {/* Curved Hemline & 4.0cm Blind Hem Turn-Up */}
                          <g
                            opacity={getLayerOpacity("hem")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "hem" ? "all" : "hem")}
                            className="cursor-pointer">
                            <path
                              d={`M -${hemHalfW} ${hemY} Q 0 ${hemY + 7} ${hemHalfW} ${hemY}`}
                              fill="none"
                              stroke="#333333"
                              strokeWidth={inspectedLayer === "hem" ? "3" : "2.1"}
                            />
                            {/* Hem Allowance Fold Line */}
                            <path
                              d={`M -${hemHalfW - 1} ${hemY - 16} Q 0 ${hemY - 9} ${hemHalfW - 1} ${hemY - 16}`}
                              fill="none"
                              stroke="#757575"
                              strokeDasharray="4 3"
                              strokeWidth={inspectedLayer === "hem" ? "1.8" : "1.1"}
                            />
                          </g>

                          {/* CLEAN ASTRA GRAY DIMENSION CALLOUT PILLS */}
                          {showCallouts && (
                            <g opacity={inspectedLayer === "all" ? 1 : 0.85}>
                              {/* Bust Callout */}
                              <line x1={bustHalfW} y1="126" x2="108" y2="126" stroke="#757575" strokeWidth="1" strokeDasharray="2 2" />
                              <circle cx={bustHalfW} cy="126" r="2" fill="#757575" />
                              <rect x="108" y="115" width="98" height="20" rx="6" fill="#ffffff" stroke="#bdbdbd" strokeWidth="1" />
                              <text x="157" y="129" fill="#333333" fontSize="9" fontWeight="500" textAnchor="middle">
                                BUST {fmtUnit(finBust)}
                              </text>

                              {/* Waist Callout */}
                              <line x1={waistHalfW} y1="220" x2="108" y2="220" stroke="#757575" strokeWidth="1" strokeDasharray="2 2" />
                              <circle cx={waistHalfW} cy="220" r="2" fill="#757575" />
                              <rect x="108" y="209" width="98" height="20" rx="6" fill="#ffffff" stroke="#bdbdbd" strokeWidth="1" />
                              <text x="157" y="223" fill="#333333" fontSize="9" fontWeight="500" textAnchor="middle">
                                WAIST {fmtUnit(finWaist)}
                              </text>

                              {/* Hip Callout */}
                              <line x1={hipHalfW} y1="312" x2="108" y2="312" stroke="#757575" strokeWidth="1" strokeDasharray="2 2" />
                              <circle cx={hipHalfW} cy="312" r="2" fill="#757575" />
                              <rect x="108" y="301" width="98" height="20" rx="6" fill="#ffffff" stroke="#bdbdbd" strokeWidth="1" />
                              <text x="157" y="315" fill="#333333" fontSize="9" fontWeight="500" textAnchor="middle">
                                HIP {fmtUnit(finHip)}
                              </text>

                              {/* HPS to Hem Length Callout */}
                              <line x1="-112" y1="44" x2="-98" y2="44" stroke="#757575" strokeWidth="1" />
                              <line x1="-112" y1={hemY} x2="-98" y2={hemY} stroke="#757575" strokeWidth="1" />
                              <line x1="-105" y1="44" x2="-105" y2={hemY} stroke="#757575" strokeWidth="1.2" />
                              <rect x="-126" y={(hemY + 44) / 2 - 48} width="20" height="96" rx="6" fill="#ffffff" stroke="#bdbdbd" strokeWidth="1" />
                              <text
                                x="-116"
                                y={(hemY + 44) / 2}
                                fill="#333333"
                                fontSize="9"
                                fontWeight="500"
                                textAnchor="middle"
                                transform={`rotate(-90 -116 ${(hemY + 44) / 2})`}>
                                {hemCut.toUpperCase()} {fmtUnit(finLength)}
                              </text>
                            </g>
                          )}
                        </motion.g>

                        {/* ===== BACK VIEW ===== */}
                        <motion.g
                          key={`back-${garmentBlock}-${closureChoice}`}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.26, ease: EDITORIAL_EASE }}
                          transform="translate(680, 52)">
                          <rect x="-95" y="0" width="190" height="22" rx="11" fill="#f2f2f2" stroke="#e0e0e0" strokeWidth="1" />
                          <text x="0" y="15" fill="#333333" fontSize="10.5" textAnchor="middle" fontWeight="500" letterSpacing="0.8">
                            BACK PIECE ({selectedSize})
                          </text>

                          {/* Outer Seam Allowance Cutting Line & Net Silhouette */}
                          <g
                            opacity={getLayerOpacity("silhouette")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "silhouette" ? "all" : "silhouette")}
                            className="cursor-pointer">
                            <path
                              d={backContourPath}
                              transform="scale(1.06, 1.022) translate(0, -4)"
                              fill="rgba(79, 79, 79, 0.02)"
                              stroke="#757575"
                              strokeWidth="1.2"
                              strokeDasharray="5 3"
                              strokeLinejoin="round"
                            />
                            <path
                              d={backContourPath}
                              fill="#ffffff"
                              stroke="#333333"
                              strokeWidth={inspectedLayer === "silhouette" ? "3" : "2.1"}
                              strokeLinejoin="round"
                            />
                            {/* Back Seam Notches */}
                            <line x1={-bustHalfW - 4} y1="126" x2={-bustHalfW + 3} y2="126" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={bustHalfW - 3} y1="126" x2={bustHalfW + 4} y2="126" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={-waistHalfW - 4} y1="220" x2={-waistHalfW + 3} y2="220" stroke="#4f4f4f" strokeWidth="1.6" />
                            <line x1={waistHalfW - 3} y1="220" x2={waistHalfW + 4} y2="220" stroke="#4f4f4f" strokeWidth="1.6" />
                          </g>

                          {/* Back Neckline Facing & Double Armscye Notches */}
                          <g
                            opacity={getLayerOpacity("seams")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "seams" ? "all" : "seams")}
                            className="cursor-pointer">
                            <path
                              d="M -32 48 Q 0 65 32 48"
                              fill="none"
                              stroke="#757575"
                              strokeDasharray="3 2"
                              strokeWidth={inspectedLayer === "seams" ? "1.8" : "1.1"}
                            />
                            {/* Double Armscye Notches (Standard Back Pattern Indicator) */}
                            <line x1="-43" y1="85" x2="-37" y2="87" stroke="#4f4f4f" strokeWidth="1.5" />
                            <line x1="-44" y1="90" x2="-38" y2="92" stroke="#4f4f4f" strokeWidth="1.5" />
                            <line x1="43" y1="85" x2="37" y2="87" stroke="#4f4f4f" strokeWidth="1.5" />
                            <line x1="44" y1="90" x2="38" y2="92" stroke="#4f4f4f" strokeWidth="1.5" />
                          </g>

                          {/* Horizontal Balance Lines (Back) */}
                          <g opacity={inspectedLayer === "all" || inspectedLayer === "silhouette" ? 1 : 0.25}>
                            <line x1={-bustHalfW} y1="126" x2={bustHalfW} y2="126" stroke="#bdbdbd" strokeDasharray="3 3" strokeWidth="1" />
                            <line x1={-waistHalfW} y1="220" x2={waistHalfW} y2="220" stroke="#757575" strokeDasharray="4 3" strokeWidth="1.2" />
                            <line x1={-hipHalfW} y1="312" x2={hipHalfW} y2="312" stroke="#bdbdbd" strokeDasharray="3 3" strokeWidth="1" />
                          </g>

                          {/* Center-Back Seam & Dynamic Fastening / Zipper / Fold Line */}
                          <g
                            opacity={getLayerOpacity("zipper")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "zipper" ? "all" : "zipper")}
                            className="cursor-pointer">
                            {closureChoice === "Back Invisible Zipper (55cm)" ? (
                              <>
                                {/* 1.5cm Zipper Seam Allowance Guides */}
                                <line x1="-5" y1="52" x2="-5" y2={zipperEndY} stroke="#757575" strokeWidth="0.9" strokeDasharray="2 2" />
                                <line x1="5" y1="52" x2="5" y2={zipperEndY} stroke="#757575" strokeWidth="0.9" strokeDasharray="2 2" />
                                {/* Main Zipper Coil Track */}
                                <line
                                  x1="0"
                                  y1="52"
                                  x2="0"
                                  y2={zipperEndY}
                                  stroke="#333333"
                                  strokeWidth={inspectedLayer === "zipper" ? "2.8" : "2.1"}
                                  strokeDasharray="5 2.5"
                                />
                                {/* Zipper Slider & Pull Tab */}
                                <rect x="-4" y="54" width="8" height="11" rx="2" fill="#4f4f4f" />
                                <circle cx="0" cy="59.5" r="1.5" fill="#ffffff" />
                                {/* Zipper Stop Bar-Tack */}
                                <rect x="-7" y={zipperEndY - 2} width="14" height="4" rx="1" fill="#4f4f4f" />
                                {/* Center Back Seam Below Zipper */}
                                <line x1="0" y1={zipperEndY} x2="0" y2={hemY + 3} stroke="#4f4f4f" strokeWidth="1.5" />
                              </>
                            ) : closureChoice === "Side Invisible Zipper (35cm)" ? (
                              <>
                                {/* Back is on fold */}
                                <line x1="0" y1="52" x2="0" y2={hemY + 3} stroke="#757575" strokeWidth="1.1" strokeDasharray="8 3 2 3" />
                                <text x="5" y="75" fill="#4f4f4f" fontSize="8" fontWeight="500">CB FOLD</text>
                                {/* Side zip indicator on left seam */}
                                <line x1={-waistHalfW - 3} y1="180" x2={-waistHalfW - 3} y2="255" stroke="#4f4f4f" strokeWidth="2.4" strokeDasharray="4 2" />
                                <rect x={-waistHalfW - 6} y="180" width="6" height="8" rx="1" fill="#4f4f4f" />
                              </>
                            ) : closureChoice === "Front Button Placket" ? (
                              <>
                                {/* Center back seam with vent */}
                                <line x1="0" y1="52" x2="0" y2={hemY + 3} stroke="#4f4f4f" strokeWidth="1.4" />
                                <text x="5" y="75" fill="#4f4f4f" fontSize="8" fontWeight="500">CB SEAM</text>
                              </>
                            ) : closureChoice === "Back Keyhole & Loop Button" ? (
                              <>
                                {/* Upper Back Keyhole Slit */}
                                <path d="M 0 52 C -5 58, -5 74, 0 80 C 5 74, 5 58, 0 52" fill="#f2f2f2" stroke="#4f4f4f" strokeWidth="1.5" />
                                <circle cx="0" cy="50" r="3" fill="#ffffff" stroke="#4f4f4f" strokeWidth="1.4" />
                                <line x1="0" y1="80" x2="0" y2={hemY + 3} stroke="#4f4f4f" strokeWidth="1.4" />
                                <text x="6" y="95" fill="#4f4f4f" fontSize="8" fontWeight="500">CB SEAM</text>
                              </>
                            ) : (
                              <>
                                {/* Pullover / Slip-on (No Zipper): Cut on Fold */}
                                <line x1="0" y1="52" x2="0" y2={hemY + 3} stroke="#757575" strokeWidth="1.2" strokeDasharray="8 3 2 3" />
                                <text x="5" y="75" fill="#4f4f4f" fontSize="8.5" fontWeight="500">CB FOLD (NO ZIP)</text>
                              </>
                            )}
                          </g>

                          {/* Fastening & Seam Callout */}
                          {showCallouts && (
                            <g opacity={getLayerOpacity("zipper")} style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
                              <line x1="5" y1="172" x2="98" y2="172" stroke="#757575" strokeWidth="1" strokeDasharray="2 2" />
                              <rect x="98" y="161" width="124" height="20" rx="6" fill="#ffffff" stroke="#bdbdbd" strokeWidth="1" />
                              <text x="160" y="174" fill="#333333" fontSize="8.5" fontWeight="500" textAnchor="middle">
                                {closureChoice === "Back Invisible Zipper (55cm)"
                                  ? "55cm CB ZIPPER"
                                  : closureChoice === "Side Invisible Zipper (35cm)"
                                  ? "35cm SIDE ZIP // CB FOLD"
                                  : closureChoice === "Front Button Placket"
                                  ? "CB SEAM // NO ZIP"
                                  : closureChoice === "Back Keyhole & Loop Button"
                                  ? "KEYHOLE & BUTTON"
                                  : "CB FOLD // NO ZIPPER"}
                              </text>
                            </g>
                          )}

                          {/* Back Diamond Waist Darts */}
                          {showDarts && (
                            <g
                              opacity={getLayerOpacity("darts")}
                              style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                              onClick={() => setInspectedLayer(inspectedLayer === "darts" ? "all" : "darts")}
                              className="cursor-pointer">
                              <path
                                d="M -24 142 L -17.5 220 L -24 288 L -30.5 220 Z"
                                fill={inspectedLayer === "darts" ? "rgba(79,79,79,0.16)" : "rgba(79,79,79,0.06)"}
                                stroke="#4f4f4f"
                                strokeWidth={inspectedLayer === "darts" ? "2" : "1.3"}
                              />
                              <line x1="-24" y1="142" x2="-24" y2="288" stroke="#757575" strokeWidth="0.8" strokeDasharray="2 2" />

                              <path
                                d="M 24 142 L 30.5 220 L 24 288 L 17.5 220 Z"
                                fill={inspectedLayer === "darts" ? "rgba(79,79,79,0.16)" : "rgba(79,79,79,0.06)"}
                                stroke="#4f4f4f"
                                strokeWidth={inspectedLayer === "darts" ? "2" : "1.3"}
                              />
                              <line x1="24" y1="142" x2="24" y2="288" stroke="#757575" strokeWidth="0.8" strokeDasharray="2 2" />
                            </g>
                          )}

                          {/* Back Curved Hemline */}
                          <g
                            opacity={getLayerOpacity("hem")}
                            style={{ transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                            onClick={() => setInspectedLayer(inspectedLayer === "hem" ? "all" : "hem")}
                            className="cursor-pointer">
                            <path
                              d={`M -${hemHalfW} ${hemY} Q 0 ${hemY + 6} ${hemHalfW} ${hemY}`}
                              fill="none"
                              stroke="#333333"
                              strokeWidth={inspectedLayer === "hem" ? "3" : "2.1"}
                            />
                            <path
                              d={`M -${hemHalfW - 1} ${hemY - 16} Q 0 ${hemY - 10} ${hemHalfW - 1} ${hemY - 16}`}
                              fill="none"
                              stroke="#757575"
                              strokeDasharray="4 3"
                              strokeWidth={inspectedLayer === "hem" ? "1.8" : "1.1"}
                            />
                          </g>
                        </motion.g>

                        {/* ===== SLEEVE PATTERN PIECE (Dynamic when Short or Long Sleeve is selected) ===== */}
                        {sleeveCut !== "Sleeveless" && (
                          <g
                            transform="translate(460, 345)"
                            onClick={() => setInspectedLayer(inspectedLayer === "seams" ? "all" : "seams")}
                            className="cursor-pointer">
                            <rect x="-78" y="-24" width="156" height="19" rx="9" fill="#f2f2f2" stroke="#e0e0e0" strokeWidth="1" />
                            <text x="0" y="-11" fill="#333333" fontSize="9" textAnchor="middle" fontWeight="500" letterSpacing="0.7">
                              {sleeveCut.toUpperCase()} SLEEVE (CUT 2)
                            </text>
                            {(() => {
                              const slvLenY = sleeveCut === "Long" ? 185 : 88;
                              const slvWristW = sleeveCut === "Long" ? 30 : 42;
                              const slvPath = `M -48 34 C -36 4, -18 -2, 0 -2 C 18 -2, 36 4, 48 34 L ${slvWristW} ${slvLenY} L -${slvWristW} ${slvLenY} Z`;
                              return (
                                <>
                                  <path
                                    d={slvPath}
                                    transform="scale(1.08, 1.04) translate(0, -2)"
                                    fill="rgba(79,79,79,0.03)"
                                    stroke="#757575"
                                    strokeWidth="1.1"
                                    strokeDasharray="4 3"
                                  />
                                  <path
                                    d={slvPath}
                                    fill="#ffffff"
                                    stroke="#333333"
                                    strokeWidth="2.0"
                                    strokeLinejoin="round"
                                  />
                                  {/* Bicep Line & Grainline */}
                                  <line x1="-46" y1="34" x2="46" y2="34" stroke="#bdbdbd" strokeWidth="0.9" strokeDasharray="3 2" />
                                  <line x1="0" y1="6" x2="0" y2={slvLenY - 8} stroke="#4f4f4f" strokeWidth="1" />
                                  <line x1={-slvWristW + 1} y1={slvLenY - 10} x2={slvWristW - 1} y2={slvLenY - 10} stroke="#757575" strokeWidth="1" strokeDasharray="3 2" />
                                  {/* Shoulder Crown & Front/Back Pitch Notches */}
                                  <line x1="0" y1="-6" x2="0" y2="3" stroke="#4f4f4f" strokeWidth="1.5" />
                                  <line x1="-28" y1="10" x2="-23" y2="15" stroke="#4f4f4f" strokeWidth="1.5" />
                                  <line x1="26" y1="9" x2="21" y2="14" stroke="#4f4f4f" strokeWidth="1.5" />
                                  <line x1="30" y1="13" x2="25" y2="18" stroke="#4f4f4f" strokeWidth="1.5" />
                                </>
                              );
                            })()}
                          </g>
                        )}

                        {/* Bottom CAD Scale Bar & Legend Footer inside SVG */}
                        <line x1="8" y1="576" x2="912" y2="576" stroke="#e0e0e0" strokeWidth="1" />
                        <g transform="translate(24, 588)">
                          <rect x="0" y="2" width="50" height="6" fill="#757575" />
                          <rect x="50" y="2" width="50" height="6" fill="#ffffff" stroke="#757575" strokeWidth="1" />
                          <text x="110" y="9" fill="#333333" fontSize="9.5" fontWeight="500">
                            SCALE BAR: 0 — 10 — 20 cm (1:10 METRIC)
                          </text>
                        </g>
                        <text x="896" y="597" fill="#757575" fontSize="9.5" fontWeight="500" textAnchor="end">
                          SOLID = NET SEWING LINE  //  DASHED OUTER = 1.5cm SEAM ALLOWANCE
                        </text>
                      </svg>
                    </div>
                  </div>

                  {/* Bottom Vector Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4F4F4F] px-1 py-1">
                    <span className="flex items-center gap-2 font-normal text-[#4F4F4F]">
                      <RiCodeSSlashLine className="w-4 h-4 text-[#757575]" />
                      Drawn to 1:10 scale. Ready to print or open in pattern software (Seamly2D, Clo3D, Illustrator).
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadSVG}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs ${SECONDARY_PILL_BTN}`}>
                        <RiDownload2Line className="w-3.5 h-3.5 text-[#757575]" /> Download Pattern (.svg)
                      </button>
                      <button
                        onClick={handleDownloadJSON}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs ${SECONDARY_PILL_BTN}`}>
                        <RiDownload2Line className="w-3.5 h-3.5 text-[#757575]" /> Download Data (.json)
                      </button>
                    </div>
                  </div>

                  {/* 4 PATTERN SUMMARY CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-white border border-[#E0E0E0] hover:border-[#BDBDBD] transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#757575]" />
                        <h4 className="text-xs font-medium text-[#1E1E1E]">1. Cut &amp; Stitch Lines</h4>
                      </div>
                      <p className="text-xs text-[#4F4F4F] font-normal leading-relaxed">
                        The solid stitch line is where you sew. The outer dashed line includes a 1.5 cm allowance for cutting the fabric.
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-[#F2F2F2] font-mono text-[11px] text-[#4F4F4F] font-medium">
                        Seam allowance: 1.5 cm
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#E0E0E0] hover:border-[#BDBDBD] transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#757575]" />
                        <h4 className="text-xs font-medium text-[#1E1E1E]">2. Fastening &amp; Closure</h4>
                      </div>
                      <p className="text-xs text-[#4F4F4F] font-normal leading-relaxed">
                        {closureChoice.includes("No Zipper")
                          ? "Designed as a pullover / slip-on garment cut on the fold with zero zippers required."
                          : closureChoice.includes("Button")
                          ? "Front button placket fastening with reinforced facing. Center back cut on seam or fold."
                          : closureChoice.includes("Side")
                          ? "35 cm hidden side zipper on the left seam. Center back is cut on the fold."
                          : "Hidden 55 cm invisible zipper down the center back with a bar-tack stop at the bottom."}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-[#F2F2F2] font-mono text-[11px] text-[#4F4F4F] font-medium truncate">
                        {closureChoice}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#E0E0E0] hover:border-[#BDBDBD] transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#757575]" />
                        <h4 className="text-xs font-medium text-[#1E1E1E]">3. Bust &amp; Waist Darts</h4>
                      </div>
                      <p className="text-xs text-[#4F4F4F] font-normal leading-relaxed">
                        Front bust darts and waist shaping darts contour the fabric smoothly around the chest and waist.
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-[#F2F2F2] font-mono text-[11px] text-[#4F4F4F] font-medium">
                        Waist intake: 2.5cm F / 3.0cm B
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#E0E0E0] hover:border-[#BDBDBD] transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#757575]" />
                        <h4 className="text-xs font-medium text-[#1E1E1E]">4. Hemline &amp; Fold</h4>
                      </div>
                      <p className="text-xs text-[#4F4F4F] font-normal leading-relaxed">
                        Finished dress length of {finLength.toFixed(1)} cm ({hemCut} cut) with an extra 4.0 cm fold at the bottom for hemming.
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-[#F2F2F2] font-mono text-[11px] text-[#4F4F4F] font-medium">
                        Bottom hem fold: 4.0 cm
                      </div>
                    </div>
                  </div>

                  {/* QUICK TAILOR SUMMARY & SEAM ALLOWANCES TABLE */}
                  <div className="p-5 rounded-2xl bg-white border border-[#E0E0E0] space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiRuler2Line className="w-4 h-4 text-[#757575]" />
                        <h4 className="text-xs font-medium text-[#1E1E1E] uppercase tracking-wider">
                          Pattern Piece Summary &amp; Seam Allowances
                        </h4>
                      </div>
                      <span className="text-xs text-[#4F4F4F] font-normal">
                        Size: <strong className="text-[#1E1E1E] font-medium">{selectedSize}</strong> ({silhouetteFit})
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse tabular-nums">
                        <thead>
                          <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8] text-[11px] text-[#4F4F4F] font-medium uppercase tracking-wider">
                            <th className="py-2.5 px-3">Pattern Area</th>
                            <th className="py-2.5 px-3">Finished Measurement</th>
                            <th className="py-2.5 px-3">Seam Allowance</th>
                            <th className="py-2.5 px-3">Tailor Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5E5] text-xs text-[#4F4F4F]">
                          <tr className="hover:bg-[#FAFAFA]">
                            <td className="py-2.5 px-3 font-medium text-[#1E1E1E]">Front Neckline</td>
                            <td className="py-2.5 px-3 font-mono text-[#1E1E1E] font-medium">4.5 cm drop · 11.2 cm half-width</td>
                            <td className="py-2.5 px-3 font-mono text-[#4F4F4F] font-normal">1.0 cm + 4.5 cm facing</td>
                            <td className="py-2.5 px-3 text-[#757575] font-normal">Reinforce square neckline corners with fusible stay-tape.</td>
                          </tr>
                          <tr className="hover:bg-[#FAFAFA]">
                            <td className="py-2.5 px-3 font-medium text-[#1E1E1E]">Armholes</td>
                            <td className="py-2.5 px-3 font-mono text-[#1E1E1E] font-medium">21.0 cm depth</td>
                            <td className="py-2.5 px-3 font-mono text-[#4F4F4F] font-normal">1.0 cm seam</td>
                            <td className="py-2.5 px-3 text-[#757575] font-normal">Single notch on front armhole, double notch on back armhole.</td>
                          </tr>
                          <tr className="hover:bg-[#FAFAFA]">
                            <td className="py-2.5 px-3 font-medium text-[#1E1E1E]">Bust &amp; Waist Darts</td>
                            <td className="py-2.5 px-3 font-mono text-[#1E1E1E] font-medium">2.5 cm front · 3.0 cm back</td>
                            <td className="py-2.5 px-3 font-mono text-[#4F4F4F] font-normal">Press toward center</td>
                            <td className="py-2.5 px-3 text-[#757575] font-normal">Stop side bust dart 2.5 cm before the apex drill target.</td>
                          </tr>
                          <tr className="hover:bg-[#FAFAFA]">
                            <td className="py-2.5 px-3 font-medium text-[#1E1E1E]">Fastening / Closure</td>
                            <td className="py-2.5 px-3 font-mono text-[#1E1E1E] font-medium">{closureChoice}</td>
                            <td className="py-2.5 px-3 font-mono text-[#4F4F4F] font-normal">
                              {closureChoice.includes("No Zipper") ? "Cut on fold" : "1.5 cm seam"}
                            </td>
                            <td className="py-2.5 px-3 text-[#757575] font-normal">
                              {closureChoice.includes("No Zipper")
                                ? "Align Center Back mark directly with folded fabric edge."
                                : "Press fusible stay-tape along the opening edges before sewing."}
                            </td>
                          </tr>
                          <tr className="hover:bg-[#FAFAFA]">
                            <td className="py-2.5 px-3 font-medium text-[#1E1E1E]">Bottom Hemline</td>
                            <td className="py-2.5 px-3 font-mono text-[#1E1E1E] font-medium">{finLength.toFixed(1)} cm length · {(hemHalfW * 4).toFixed(0)} cm sweep</td>
                            <td className="py-2.5 px-3 font-mono text-[#4F4F4F] font-normal">4.0 cm hem fold</td>
                            <td className="py-2.5 px-3 text-[#757575] font-normal">Turn up 4.0 cm at the bottom and finish with a clean blind hem.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* TAB 2: Measurements Breakdown Table */}
            {blueprintTab === "measurements" && (
              <motion.div
                key="blueprint-tab-measurements"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#1E1E1E] uppercase tracking-wider flex items-center gap-2">
                      <RiRuler2Line className="w-4 h-4 text-[#757575]" />
                      Body vs. Finished Measurements ({selectedSize})
                    </h3>
                    <p className="text-xs text-[#4F4F4F] font-normal mt-0.5">
                      We add comfort room (ease) to the body measurements so the finished outfit is comfortable to wear and move in.
                    </p>
                  </div>
                  <span className="text-xs text-[#4F4F4F] font-medium bg-[#F2F2F2] border border-[#E0E0E0] px-3 py-1 rounded-full w-fit">
                    {selectedSize} &bull; {silhouetteFit} Fit
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E0E0E0] bg-white">
                  <table className="w-full text-left text-xs text-[#4F4F4F] tabular-nums">
                    <thead className="bg-[#F8F8F8] text-[#4F4F4F] border-b border-[#E5E5E5] uppercase text-[11px] font-medium tracking-wider">
                      <tr>
                        <th className="p-3.5">Area</th>
                        <th className="p-3.5">Body Size</th>
                        <th className="p-3.5">Comfort Room Added</th>
                        <th className="p-3.5">Tweak Fit</th>
                        <th className="p-3.5 font-medium text-[#1E1E1E]">Final Size</th>
                        <th className="p-3.5">Fit Rule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5] font-mono">
                      {calculatedRows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="p-3.5 font-sans font-medium text-[#1E1E1E]">{row.label}</td>
                          <td className="p-3.5 text-[#4F4F4F] font-normal">{fmtUnit(row.body)}</td>
                          <td className="p-3.5 text-[#1E1E1E] font-medium">+{fmtUnit(row.ease)}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-sans">
                              <button
                                onClick={() => handleQuickAdjustEase(row.fieldKey, -0.5)}
                                title="Make 0.5 cm tighter"
                                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#F5F5F5] text-[#4F4F4F] border border-[#E0E0E0] hover:border-[#BDBDBD] text-[11px] font-medium transition-all duration-150 active:scale-95 cursor-pointer">
                                -0.5 cm
                              </button>
                              <button
                                onClick={() => handleQuickAdjustEase(row.fieldKey, 0.5)}
                                title="Make 0.5 cm looser"
                                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#F5F5F5] text-[#4F4F4F] border border-[#E0E0E0] hover:border-[#BDBDBD] text-[11px] font-medium transition-all duration-150 active:scale-95 cursor-pointer">
                                +0.5 cm
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium text-[#1E1E1E] text-sm bg-[#F8F8F8]">
                            {fmtUnit(row.garment)}
                          </td>
                          <td className="p-3.5 text-[11px] text-[#757575] font-sans font-normal">{row.rule_id} ({row.status})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Seam Allowance Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-4 rounded-2xl bg-white border border-[#E0E0E0] text-xs tabular-nums">
                  <div>
                    <span className="text-[#757575] font-medium block text-[11px]">Side &amp; Shoulder Seams</span>
                    <strong className="text-[#1E1E1E] font-mono font-medium text-sm">1.5 cm</strong>
                  </div>
                  <div>
                    <span className="text-[#757575] font-medium block text-[11px]">Bottom Hem Fold</span>
                    <strong className="text-[#1E1E1E] font-mono font-medium text-sm">4.0 cm</strong>
                  </div>
                  <div>
                    <span className="text-[#757575] font-medium block text-[11px]">Neckline &amp; Armholes</span>
                    <strong className="text-[#1E1E1E] font-mono font-medium text-sm">1.0 cm</strong>
                  </div>
                  <div>
                    <span className="text-[#757575] font-medium block text-[11px]">
                      {closureChoice.includes("No Zipper") ? "Center Back" : "Closure Seam"}
                    </span>
                    <strong className="text-[#1E1E1E] font-mono font-medium text-sm">
                      {closureChoice.includes("No Zipper") ? "Cut on fold" : "1.5 cm"}
                    </strong>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: Interactive Sewing Steps & Materials */}
            {blueprintTab === "assembly" && (
              <motion.div
                key="blueprint-tab-assembly"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Construction Steps */}
                <div className="lg:col-span-8 p-4 sm:p-6 rounded-2xl bg-white border border-[#E0E0E0] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-medium text-[#1E1E1E] flex items-center gap-2">
                        <RiCheckboxLine className="w-4 h-4 text-[#757575]" />
                        Step-by-Step Sewing Guide
                      </h3>
                      <p className="text-xs text-[#4F4F4F] font-normal mt-0.5">
                        Click any step below to mark it as done while sewing the outfit.
                      </p>
                    </div>
                    <div className="text-xs font-mono font-medium text-[#4F4F4F] bg-[#F2F2F2] px-3 py-1 rounded-full border border-[#E0E0E0]">
                      {completedSteps.length} of 6 Done
                    </div>
                  </div>

                  {/* Progress bar with smooth spring fill */}
                  <div className="w-full bg-[#F2F2F2] h-2 rounded-full overflow-hidden border border-[#E5E5E5]">
                    <motion.div
                      className="bg-[#757575] h-full rounded-full"
                      initial={false}
                      animate={{ width: `${(completedSteps.length / 6) * 100}%` }}
                      transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    />
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2.5">
                    {[
                      { step: 1, title: "Prep the Neckline", desc: "Iron fusible interfacing onto the neckline facing pieces and stay-stitch curved edges at 1.0 cm." },
                      { step: 2, title: "Sew the Darts", desc: "Stitch the front bust darts and front/back waist darts, then press them flat toward the center." },
                      { step: 3, title: "Join Shoulders & Facing", desc: "Sew the front and back shoulder seams together, attach the neckline facing, and understitch." },
                      {
                        step: 4,
                        title: closureChoice.includes("No Zipper")
                          ? "Finish Center Back (Fold)"
                          : closureChoice.includes("Button")
                          ? "Attach Front Button Placket"
                          : closureChoice.includes("Side")
                          ? "Insert Side Seam Zipper"
                          : "Insert Back Zipper",
                        desc: closureChoice.includes("No Zipper")
                          ? "Back piece is cut on fold with zero zippers. Neaten center-back seam allowances."
                          : closureChoice.includes("Button")
                          ? "Sew center-front placket and stitch buttonholes spaced evenly at 7.0 cm intervals."
                          : closureChoice.includes("Side")
                          ? "Sew 35 cm invisible zipper into the left side seam using 1.5 cm seam allowance."
                          : "Sew the 55 cm invisible zipper into the center-back seam using 1.5 cm seam allowance."
                      },
                      { step: 5, title: "Close the Side Seams", desc: "Pin and stitch the left and right side seams from the underarm down to the hem, then neaten the edges." },
                      { step: 6, title: "Hem & Final Press", desc: "Fold up the 4.0 cm bottom hem allowance, press neatly, and finish with a blind hem stitch." }
                    ].map((s) => {
                      const isDone = completedSteps.includes(s.step);
                      return (
                        <div
                          key={s.step}
                          onClick={() => toggleStep(s.step)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 active:scale-[0.99] flex items-start gap-3.5 ${
                            isDone
                              ? "bg-[#F8F8F8] border-[#E5E5E5] text-[#757575]"
                              : "bg-white border-[#E0E0E0] hover:border-[#BDBDBD] text-[#1E1E1E]"
                          }`}>
                          <button className="mt-0.5 text-[#4F4F4F]">
                            {isDone ? (
                              <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <RiCheckboxBlankLine className="w-4 h-4 text-[#BDBDBD]" />
                            )}
                          </button>
                          <div className="flex-1 text-xs space-y-0.5">
                            <span className={`font-medium block ${isDone ? "line-through text-[#757575]" : "text-[#1E1E1E]"}`}>
                              Step {s.step}: {s.title}
                            </span>
                            <p className={isDone ? "text-[#757575] line-through font-normal" : "text-[#4F4F4F] font-normal"}>{s.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Materials & Reference Card - Astra Gray Style */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-[#E0E0E0] space-y-3">
                    <span className="text-xs font-medium text-[#1E1E1E] uppercase tracking-wider block">
                      Materials Needed
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                        <span className="text-[#757575] block text-[10px] font-medium uppercase">MAIN FABRIC</span>
                        <strong className="text-[#1E1E1E] font-medium">{fabricChoice}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                        <span className="text-[#757575] block text-[10px] font-medium uppercase">HOW MUCH FABRIC TO BUY</span>
                        <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[#4F4F4F]">60&quot; Roll (150cm):</span>
                            <strong className="text-[#1E1E1E] font-medium">{fabricYardage.yards60} yds ({fabricYardage.meters60} m)</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#4F4F4F]">45&quot; Roll / Ankara:</span>
                            <strong className="text-[#1E1E1E] font-medium">{fabricYardage.yards45} yds ({fabricYardage.meters45} m)</strong>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                        <span className="text-[#757575] block text-[10px] font-medium uppercase">ZIPPER / CLOSURE</span>
                        <strong className="text-[#1E1E1E] font-medium">{closureChoice}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                        <span className="text-[#757575] block text-[10px] font-medium uppercase">NECKLINE FACING</span>
                        <strong className="text-[#1E1E1E] font-medium">Lightweight Fusible Interfacing</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5]">
                        <span className="text-[#757575] block text-[10px] font-medium uppercase">THREAD</span>
                        <strong className="text-[#1E1E1E] font-medium">Matching All-Purpose Polyester Thread</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tailor Tip - Astra Gray Style */}
                  <div className="p-4 rounded-2xl bg-[#F8F8F8] border border-[#E5E5E5] text-xs space-y-1.5">
                    <span className="font-medium text-[#1E1E1E] block">Tailor Tip</span>
                    <p className="text-[#4F4F4F] text-xs font-normal leading-relaxed">
                      Always cut a quick test fit in calico or muslin first if you are working with a high-value fabric.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: Fit Changes & Version History */}
            {blueprintTab === "history" && (
              <motion.div
                key="blueprint-tab-history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                className="p-4 sm:p-6 rounded-2xl bg-white border border-[#E0E0E0] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-base font-medium text-[#1E1E1E] flex items-center gap-2">
                      <RiHistoryLine className="w-4 h-4 text-[#757575]" />
                      Fit Adjustments &amp; Version History
                    </h3>
                    <p className="text-xs text-[#4F4F4F] font-normal mt-0.5">
                      Every tweak you make to the fit or measurements is saved here so your tailor can see what changed.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTailorModal(true)}
                    className={`px-4 py-2 text-xs flex items-center gap-1.5 self-start sm:self-auto ${SECONDARY_PILL_BTN}`}>
                    <RiScissors2Line className="w-3.5 h-3.5 text-[#757575]" /> Adjust Fit
                  </button>
                </div>

                {corrections.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center border border-dashed border-[#E0E0E0] rounded-2xl space-y-3 bg-[#F8F8F8]">
                    <RiScissors2Line className="w-8 h-8 text-[#BDBDBD] mx-auto" />
                    <p className="text-xs text-[#4F4F4F] font-normal">
                      No custom fit tweaks yet. Using standard <strong className="text-[#1E1E1E] font-medium">{selectedSize} ({silhouetteFit})</strong> measurements.
                    </p>
                    <button
                      onClick={() => setShowTailorModal(true)}
                      className={`px-4 py-2 text-xs ${SECONDARY_PILL_BTN}`}>
                      Make a Fit Adjustment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {corrections.map((c, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] text-xs space-y-2">
                        <div className="flex justify-between items-center text-[#4F4F4F]">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-[#4F4F4F] text-[10px] font-mono font-medium">
                              Version #{c.version}
                            </span>
                            <span className="text-[#1E1E1E] font-medium capitalize">{c.field}</span>
                          </div>
                          <span className="text-[11px] text-[#757575] font-normal">{c.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="line-through text-[#757575] font-mono">{c.oldVal}</span>
                          <span className="text-[#757575]">&rarr;</span>
                          <span className="text-[#1E1E1E] font-medium font-mono">{c.newVal}</span>
                          <span className="ml-auto text-[10px] px-2.5 py-0.5 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-[#4F4F4F] font-medium">
                            {c.cause}
                          </span>
                        </div>
                        {c.notes && (
                          <p className="text-xs text-[#4F4F4F] font-normal bg-white p-2.5 rounded-lg border border-[#E5E5E5]">
                            Note: {c.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>

            {/* Bottom Guided Navigation Bar for Step 3 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E0E0E0]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`w-full sm:w-auto px-4 py-2.5 text-xs flex items-center justify-center gap-2 ${SECONDARY_PILL_BTN}`}>
                  <RiArrowLeftLine className="w-3.5 h-3.5 text-[#757575]" />
                  Edit Size &amp; Fit
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`w-full sm:w-auto px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiRefreshLine className="w-3.5 h-3.5 text-[#757575]" />
                  Start New Outfit
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowTailorModal(true)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiScissors2Line className="w-3.5 h-3.5 text-[#757575]" />
                  Adjust Fit
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className={`flex-1 sm:flex-none px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 ${SECONDARY_PILL_BTN}`}>
                  <RiFileDownloadLine className="w-3.5 h-3.5 text-[#757575]" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className={`flex-1 sm:flex-none px-5 py-2.5 text-xs flex items-center justify-center gap-1.5 ${PRIMARY_PILL_BTN}`}>
                  <RiCheckLine className="w-3.5 h-3.5" />
                  Approve Pattern
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* ADJUST FIT MODAL */}
      <AnimatePresence>
        {showTailorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-[#1E1E1E]/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={MODAL_SPRING}
              className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiScissors2Line className="w-4 h-4 text-[#757575]" />
                  <h3 className="text-base sm:text-lg font-medium text-[#1E1E1E]">Adjust Fit or Details</h3>
                </div>
                <button
                  onClick={() => setShowTailorModal(false)}
                  className="text-[#757575] hover:text-[#1E1E1E] p-1 cursor-pointer">
                  <RiCloseLine className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#4F4F4F] font-normal">
                Tweak any measurement or detail below. Saving updates the pattern drawing immediately and records <strong className="text-[#1E1E1E] font-medium">Version #{versionNumber + 1}</strong>.
              </p>

              <form onSubmit={handleAddCorrection} className="space-y-4 text-xs">
                {/* Field Presets */}
                <div>
                  <label className="text-[#4F4F4F] block mb-1.5 font-medium">What would you like to adjust?</label>
                  <select
                    value={corrField}
                    onChange={(e) => handleFieldChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-medium text-xs focus:outline-none focus:border-[#757575] focus:bg-white cursor-pointer">
                    <option value="bust_ease">Bust Comfort Room (+{easeValues.bust.toFixed(1)} cm)</option>
                    <option value="waist_ease">Waist Comfort Room (+{easeValues.waist.toFixed(1)} cm)</option>
                    <option value="hip_ease">Hip Comfort Room (+{easeValues.hip.toFixed(1)} cm)</option>
                    <option value="length">Dress Length ({bodyLength} cm)</option>
                    <option value="neckline">Neckline Style ({analysis.neckline.value || "square"})</option>
                    <option value="closure">Zipper / Closure</option>
                    <option value="fabric">Main Fabric</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#4F4F4F] block mb-1 font-medium">Current Value</label>
                    <input
                      type="text"
                      value={corrOld}
                      onChange={(e) => setCorrOld(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-mono font-medium focus:outline-none focus:border-[#757575] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[#1E1E1E] block mb-1 font-medium">New Value</label>
                    <input
                      type="text"
                      value={corrNew}
                      onChange={(e) => setCorrNew(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white border border-[#757575] ring-1 ring-[#BDBDBD]/60 text-[#1E1E1E] font-mono font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Nudge Chips for Ease Fields */}
                {corrField.includes("ease") && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[11px] text-[#757575] font-normal">Quick change:</span>
                    {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
                      <button
                        type="button"
                        key={delta}
                        onClick={() => {
                          const base = parseFloat(corrOld.replace(/[^0-9.-]/g, "")) || 0;
                          setCorrNew(`+${(base + delta).toFixed(1)} cm`);
                        }}
                        className="px-2.5 py-1 rounded-full bg-[#F2F2F2] hover:bg-[#E5E5E5] text-[#4F4F4F] text-[10px] font-mono font-medium border border-[#E0E0E0] transition-colors cursor-pointer">
                        {delta > 0 ? `+${delta}` : delta} cm
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-[#4F4F4F] block mb-1 font-medium">Reason for Change</label>
                  <select
                    value={corrCause}
                    onChange={(e) => setCorrCause(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-medium text-xs focus:outline-none focus:border-[#757575] focus:bg-white cursor-pointer">
                    <option value="Fit Adjustment">Make it slightly looser or tighter</option>
                    <option value="Tailor Preference">Tailor preference</option>
                    <option value="Style Match">Match reference photo better</option>
                    <option value="Client Request">Client request</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#4F4F4F] block mb-1 font-medium">Note for the Tailor (Optional)</label>
                  <textarea
                    rows={2}
                    value={corrNotes}
                    onChange={(e) => setCorrNotes(e.target.value)}
                    placeholder="Add a short note about this change..."
                    className="w-full p-2.5 rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] text-[#1E1E1E] font-normal text-xs focus:outline-none focus:border-[#757575] focus:bg-white resize-none placeholder:text-[#757575]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                  <button
                    type="button"
                    onClick={() => setShowTailorModal(false)}
                    className={`px-4 py-2 text-xs ${SECONDARY_PILL_BTN}`}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-xs ${PRIMARY_PILL_BTN}`}>
                    Save Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIZING & FIT GUIDE MODAL */}
      <AnimatePresence>
        {showQuestionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1E1E1E]/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={MODAL_SPRING}
              className="w-full max-w-2xl bg-white border border-[#E0E0E0] rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2">
                  <RiQuestionLine className="w-5 h-5 text-[#757575] shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-[#1E1E1E] truncate">Sizing &amp; Fit Reference Guide</h3>
                    <p className="text-[11px] text-[#757575] font-normal truncate">Standard comfort allowances and length rules used in this studio</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuestionsModal(false)}
                  className="text-[#757575] hover:text-[#1E1E1E] p-1 cursor-pointer">
                  <RiCloseLine className="w-5 h-5" />
                </button>
              </div>

              {/* Track Selector Tabs - Sliding Pill */}
              <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-2.5 overflow-x-auto whitespace-nowrap scrollbar-none -mx-1 px-1">
                {[
                  { id: "womenswear", label: "Womenswear Sizing" },
                  { id: "menswear", label: "Menswear Sizing" },
                  { id: "pitch", label: "About Tailor Sheets" }
                ].map((tab) => {
                  const active = questionnaireTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setQuestionnaireTab(tab.id as any)}
                      className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                        active ? "text-[#1E1E1E] border-transparent" : OPTION_IDLE
                      }`}>
                      {active && (
                        <motion.span
                          layoutId="guide-tab-pill"
                          transition={TACTILE_SPRING}
                          className="absolute inset-0 rounded-full bg-[#F2F2F2] border border-[#757575] ring-1 ring-[#BDBDBD]/60 shadow-2xs pointer-events-none"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-3 text-xs text-[#4F4F4F] pr-1 sm:pr-2">
                {questionnaireTab === "womenswear" && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#F8F8F8] rounded-xl border border-[#E5E5E5] space-y-1">
                      <span className="font-medium text-[#1E1E1E] uppercase tracking-wider text-[11px] block">
                        Standard Dress Lengths
                      </span>
                      <p className="text-[#4F4F4F] font-normal leading-relaxed">
                        Measured from the top of the shoulder down to the hem: Mini (85 cm), Midi (105 cm), and Maxi (140 cm).
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#F8F8F8] rounded-xl border border-[#E5E5E5] space-y-1">
                      <span className="font-medium text-[#1E1E1E] uppercase tracking-wider text-[11px] block">
                        Key Body Measurements
                      </span>
                      <p className="text-[#4F4F4F] font-normal leading-relaxed">
                        Bust (fullest part of chest), natural waist, fullest hip, and shoulder-to-hem length.
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#F8F8F8] rounded-xl border border-[#E5E5E5] space-y-1.5">
                      <span className="font-medium text-[#1E1E1E] uppercase tracking-wider text-[11px] block">
                        Current Comfort Room (Added to Body Size)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
                        <div className="p-2 bg-white rounded-lg border border-[#E5E5E5] text-[#1E1E1E]">
                          Bust: <strong className="font-medium">+{easeValues.bust.toFixed(1)} cm</strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#E5E5E5] text-[#1E1E1E]">
                          Waist: <strong className="font-medium">+{easeValues.waist.toFixed(1)} cm</strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#E5E5E5] text-[#1E1E1E]">
                          Hip: <strong className="font-medium">+{easeValues.hip.toFixed(1)} cm</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {questionnaireTab === "menswear" && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#F8F8F8] rounded-xl border border-[#E5E5E5] space-y-1">
                      <span className="font-medium text-[#1E1E1E] uppercase tracking-wider text-[11px] block">
                        Menswear Tailoring Blocks
                      </span>
                      <p className="text-[#4F4F4F] font-normal leading-relaxed">
                        Supports structured 2-button blazers, tailored trousers, and Senator / Kaftan tunic sets.
                      </p>
                    </div>
                    <div className="p-3.5 bg-[#F8F8F8] rounded-xl border border-[#E5E5E5] space-y-1.5">
                      <span className="font-medium text-[#1E1E1E] uppercase tracking-wider text-[11px] block">
                        Standard Menswear Comfort Room
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
                        <div className="p-2 bg-white rounded-lg border border-[#E5E5E5] text-[#1E1E1E]">
                          Chest: <strong className="font-medium">+8.0 to +12.0 cm</strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#E5E5E5] text-[#1E1E1E]">
                          Waist: <strong className="font-medium">+6.0 cm</strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#E5E5E5] text-[#1E1E1E]">
                          Seat: <strong className="font-medium">+5.0 cm</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {questionnaireTab === "pitch" && (
                  <div className="space-y-3">
                    <div className="p-4 bg-[#F8F8F8] border border-[#E5E5E5] text-[#1E1E1E] rounded-xl space-y-1.5">
                      <h4 className="font-medium text-[#1E1E1E] text-sm">How Tailor Sheets Work</h4>
                      <p className="text-[#4F4F4F] text-xs font-normal leading-relaxed">
                        Each pattern sheet combines your outfit photo, exact body and finished measurements, seam allowances, and step-by-step sewing instructions on a single printable A4 page.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-2 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[11px] text-[#757575] font-normal truncate">
                  UK Metric Tailoring Standard
                </span>
                <button
                  onClick={() => setShowQuestionsModal(false)}
                  className={`w-full sm:w-auto px-5 py-2 text-xs ${PRIMARY_PILL_BTN}`}>
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Universal Garment Upload Modal */}
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1E1E1E]/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={MODAL_SPRING}
              className="bg-white rounded-2xl border border-[#E0E0E0] shadow-xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#757575] flex items-center justify-center shrink-0">
                    <RiUploadCloud2Line className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-medium text-[#1E1E1E] font-[ClashGrotesk-medium] truncate">
                      Upload Outfit Photo or Sketch
                    </h3>
                    <p className="text-xs text-[#4F4F4F] font-normal truncate">
                      Choose a photo from your device or pick a sample style below.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 rounded-full hover:bg-[#F5F5F5] text-[#757575] hover:text-[#1E1E1E] transition-colors cursor-pointer">
                  <RiCloseLine className="w-4 h-4" />
                </button>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => globalFileInputRef.current?.click()}
                className={`p-5 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 ${
                  isDragOver
                    ? "border-[#757575] bg-[#F2F2F2]"
                    : "border-[#E0E0E0] bg-[#F8F8F8] hover:border-[#BDBDBD] hover:bg-[#F2F2F2]/60"
                }`}>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-[#E0E0E0] text-[#757575] flex items-center justify-center">
                  <RiUploadCloud2Line className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#1E1E1E]">
                    Click to browse files or drag &amp; drop an image here
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#757575] font-normal mt-0.5">
                    Supports PNG, JPG, JPEG, WEBP, and SVG
                  </p>
                </div>
                <span className="px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-white border border-[#D0D5DD] text-[#4F4F4F] shadow-2xs">
                  Choose from Device
                </span>
              </div>

              <input
                ref={globalFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Benchmark options */}
              <div className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#4F4F4F]">
                  Or pick a sample style:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "/design_placeholder_1.png", label: "Square Sheath" },
                    { id: "/design_placeholder_2.png", label: "A-Line Dress" },
                    { id: "/design_placeholder_4.png", label: "Midi Slip" },
                    { id: "/designs_jacket.png", label: "Tailored Blazer" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSample(s.id);
                        setUploadedFileName(null);
                        setUploadedFileSize(null);
                        triggerToast("Style Selected", `${s.label} selected.`);
                        setShowUploadModal(false);
                      }}
                      className="p-2 rounded-xl border border-[#E0E0E0] hover:border-[#757575] bg-white text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer group">
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#F8F8F8] mb-1.5">
                        <img
                          src={s.id}
                          alt={s.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[#4F4F4F] block truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className={`w-full sm:w-auto px-5 py-2 text-xs ${SECONDARY_PILL_BTN}`}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE POP-UP TUTORIAL MODAL (HOW IT WORKS) */}
      <AnimatePresence>
        {showTutorialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1E1E1E]/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={MODAL_SPRING}
              className="bg-white rounded-2xl border border-[#E0E0E0] shadow-2xl max-w-2xl w-full p-5 sm:p-7 space-y-5 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E5E5E5] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#757575] flex items-center justify-center shrink-0">
                    <RiSparkling2Line className="w-5 h-5 text-[#757575]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-medium text-[#1E1E1E] font-[ClashGrotesk-medium]">
                        How Astra Pattern Studio Works
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F2F2F2] border border-[#E0E0E0] text-[10px] font-mono font-medium text-[#4F4F4F]">
                        {tutorialSlide + 1} of 4
                      </span>
                    </div>
                    <p className="text-xs text-[#4F4F4F] font-normal mt-0.5">
                      A quick 1-minute guide to turning any outfit photo into a real tailor pattern sheet.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseTutorial}
                  title="Close tutorial"
                  className="p-1.5 rounded-full hover:bg-[#F5F5F5] text-[#757575] hover:text-[#1E1E1E] transition-colors cursor-pointer">
                  <RiCloseLine className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Step Pills - Sliding Astra Gray Outline Highlight */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { idx: 0, label: "1. Big Picture" },
                  { idx: 1, label: "2. Pick Outfit" },
                  { idx: 2, label: "3. Size & Fit" },
                  { idx: 3, label: "4. Pattern Sheet" }
                ].map((tab) => {
                  const isActive = tutorialSlide === tab.idx;
                  return (
                    <button
                      key={tab.idx}
                      type="button"
                      onClick={() => setTutorialSlide(tab.idx)}
                      className={`relative px-3 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        isActive ? "text-[#1E1E1E] border-transparent" : OPTION_IDLE
                      }`}>
                      {isActive && (
                        <motion.span
                          layoutId="tutorial-tab-pill"
                          transition={TACTILE_SPRING}
                          className="absolute inset-0 rounded-full bg-[#F2F2F2] border border-[#757575] ring-1 ring-[#BDBDBD]/60 shadow-2xs pointer-events-none"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Slide Content */}
              <div className="flex-1 overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                  {tutorialSlide === 0 && (
                    <motion.div
                      key="slide-0"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4">
                      <div className="p-4 rounded-2xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#1E1E1E] space-y-1.5">
                        <h4 className="text-sm font-medium text-[#1E1E1E]">
                          What does this studio do?
                        </h4>
                        <p className="text-xs text-[#4F4F4F] font-normal leading-relaxed">
                          When you have an outfit photo or an AI design, a tailor still needs exact centimeter measurements, seam allowances, and pattern pieces to cut and sew it. This studio creates that complete tailor sheet in 3 simple steps:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1.5">
                          <span className="w-6 h-6 rounded-full bg-white border border-[#D0D5DD] text-[#4F4F4F] text-xs font-mono font-medium flex items-center justify-center">
                            1
                          </span>
                          <h5 className="text-xs font-medium text-[#1E1E1E]">Pick Outfit Photo</h5>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            Upload a photo or pick a sample dress. We detect the visible style details like neckline, sleeves, and length.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1.5">
                          <span className="w-6 h-6 rounded-full bg-white border border-[#D0D5DD] text-[#4F4F4F] text-xs font-mono font-medium flex items-center justify-center">
                            2
                          </span>
                          <h5 className="text-xs font-medium text-[#1E1E1E]">Choose Size &amp; Fit</h5>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            Select a standard UK size (UK 8 to UK 18) or type custom body measurements in centimeters, plus how fitted you want it.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1.5">
                          <span className="w-6 h-6 rounded-full bg-white border border-[#D0D5DD] text-[#4F4F4F] text-xs font-mono font-medium flex items-center justify-center">
                            3
                          </span>
                          <h5 className="text-xs font-medium text-[#1E1E1E]">Print or Share</h5>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            View the 1:10 scale front &amp; back pattern drawing, check the 6 sewing steps, and print or save as a PDF for your tailor.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {tutorialSlide === 1 && (
                    <motion.div
                      key="slide-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-[#1E1E1E]">
                          Step 1: How to Choose Your Outfit Photo
                        </h4>
                        <p className="text-xs text-[#4F4F4F] font-normal">
                          You can start in three ways on Step 1:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <strong className="text-[#1E1E1E] font-medium block">Upload a Photo</strong>
                          <p className="text-[#4F4F4F] font-normal text-[11px] leading-relaxed">
                            Drag &amp; drop any dress photo, sketch, or screenshot from your phone or computer.
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <strong className="text-[#1E1E1E] font-medium block">Try a Sample Style</strong>
                          <p className="text-[#4F4F4F] font-normal text-[11px] leading-relaxed">
                            Click one of the studio sample cards (like Square Sheath or Midi Slip) to test right away.
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <strong className="text-[#1E1E1E] font-medium block">Add Tailor Notes</strong>
                          <p className="text-[#4F4F4F] font-normal text-[11px] leading-relaxed">
                            Write any special requests (like &ldquo;make the neckline slightly higher&rdquo;) in the notes box.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] flex items-center justify-between gap-3">
                        <span className="text-xs font-normal text-[#4F4F4F]">
                          Want to go to Step 1 and pick a photo now?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep(1);
                            handleCloseTutorial();
                          }}
                          className={HIGHLIGHT_LINK_BTN}>
                          <span>Go to Step 1</span>
                          <RiArrowRightLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {tutorialSlide === 2 && (
                    <motion.div
                      key="slide-2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-[#1E1E1E]">
                          Step 2: Understanding Size &amp; &ldquo;Comfort Room&rdquo;
                        </h4>
                        <p className="text-xs text-[#4F4F4F] font-normal leading-relaxed">
                          If a dress is sewn to your exact skin-tight body tape measurement, you won&apos;t be able to breathe or sit comfortably. That&apos;s why tailors add <strong className="text-[#1E1E1E] font-medium">Comfort Room (Ease)</strong>:
                        </p>
                      </div>

                      {/* Visual Formula Bar - Astra Gray Style */}
                      <div className="p-4 rounded-2xl bg-[#F8F8F8] border border-[#E5E5E5] text-[#1E1E1E] flex flex-col sm:flex-row items-center justify-between gap-2 text-center font-mono text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-[#E5E5E5] w-full sm:w-auto flex-1">
                          <span className="text-[10px] text-[#757575] block font-sans uppercase">1. Body Tape Size</span>
                          <strong className="text-sm text-[#1E1E1E] font-medium">92.0 cm Bust</strong>
                        </div>
                        <span className="text-lg font-normal text-[#BDBDBD]">+</span>
                        <div className="p-2.5 rounded-xl bg-white border border-[#E5E5E5] w-full sm:w-auto flex-1">
                          <span className="text-[10px] text-[#757575] block font-sans uppercase">2. Comfort Room</span>
                          <strong className="text-sm text-emerald-700 font-medium">+4.0 cm (Fitted)</strong>
                        </div>
                        <span className="text-lg font-normal text-[#BDBDBD]">=</span>
                        <div className="p-2.5 rounded-xl bg-white border border-[#BDBDBD] w-full sm:w-auto flex-1 shadow-2xs">
                          <span className="text-[10px] text-[#757575] block font-sans uppercase font-medium">3. Final Dress Size</span>
                          <strong className="text-sm text-[#1E1E1E] font-medium">96.0 cm Bust</strong>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] flex items-center justify-between gap-3">
                        <span className="text-xs font-normal text-[#4F4F4F]">
                          Want to try picking a size and fit on Step 2?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep(2);
                            handleCloseTutorial();
                          }}
                          className={HIGHLIGHT_LINK_BTN}>
                          <span>Go to Step 2</span>
                          <RiArrowRightLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {tutorialSlide === 3 && (
                    <motion.div
                      key="slide-3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-[#1E1E1E]">
                          Step 3: How to Read the Pattern Drawing
                        </h4>
                        <p className="text-xs text-[#4F4F4F] font-normal">
                          On Step 3, you&apos;ll see the Front Piece and Back Piece drawn at 1:10 scale. Here is what each line means:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 bg-[#4F4F4F] inline-block" />
                            <strong className="text-[#1E1E1E] font-medium">Solid Line = Stitch Line</strong>
                          </div>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            This is the exact line where the tailor stitches the front and back pieces together.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-0.5 border-b-2 border-dashed border-[#757575] inline-block" />
                            <strong className="text-[#1E1E1E] font-medium">Outer Dashed Line = Cut Line</strong>
                          </div>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            Where the tailor cuts the fabric with scissors (includes a 1.5 cm seam allowance outside the stitch line).
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <strong className="text-[#1E1E1E] font-medium flex items-center gap-1.5">
                            <RiCrosshair2Line className="w-3.5 h-3.5 text-[#757575] shrink-0" />
                            Bust Point &amp; Diamond Darts
                          </strong>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            Folded shaping wedges at the chest and waist that make flat fabric contour smoothly around the body.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] space-y-1">
                          <strong className="text-[#1E1E1E] font-medium block">Print / Save PDF Button</strong>
                          <p className="text-[11px] text-[#4F4F4F] font-normal leading-relaxed">
                            Click <strong className="font-medium text-[#1E1E1E]">Print / Save PDF</strong> at the top right of Step 3 to print a clean A4 Tailor Sheet or save it to send on WhatsApp.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-[#E5E5E5] flex items-center justify-between gap-3">
                        <span className="text-xs font-normal text-[#4F4F4F]">
                          Ready to explore the finished Pattern Sheet?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentStep(3);
                            handleCloseTutorial();
                          }}
                          className={HIGHLIGHT_LINK_BTN}>
                          <span>Open Pattern Sheet (Step 3)</span>
                          <RiArrowRightLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal Footer Navigation */}
              <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCloseTutorial}
                  className="text-xs font-normal text-[#757575] hover:text-[#1E1E1E] transition-colors cursor-pointer">
                  Skip tutorial
                </button>

                <div className="flex items-center gap-2">
                  {tutorialSlide > 0 && (
                    <button
                      type="button"
                      onClick={() => setTutorialSlide((s) => Math.max(0, s - 1))}
                      className={`px-4 py-2 text-xs ${SECONDARY_PILL_BTN}`}>
                      Previous
                    </button>
                  )}

                  {tutorialSlide < 3 ? (
                    <button
                      type="button"
                      onClick={() => setTutorialSlide((s) => Math.min(3, s + 1))}
                      className={`px-5 py-2 text-xs flex items-center gap-1.5 ${PRIMARY_PILL_BTN}`}>
                      Next Tip
                      <RiArrowRightLine className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseTutorial}
                      className={`px-5 py-2 text-xs flex items-center gap-1.5 ${PRIMARY_PILL_BTN}`}>
                      <RiCheckLine className="w-3.5 h-3.5" />
                      Got It, Start Using Studio
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
