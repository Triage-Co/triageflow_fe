# ESLint report (pre-commit)

Total: **11 errors**, **408 warnings**

## Errors (11)

1. **`prefer-const`** — `modules/kiosk/components/PaymentQrModal.tsx:40:9`
   - 'intervalId' is never reassigned. Use 'const' instead.

2. **`prefer-const`** — `modules/kiosk/modals/ServicePaymentQrModal.tsx:36:9`
   - 'intervalId' is never reassigned. Use 'const' instead.

3. **`react/no-unescaped-entities`** — `modules/kiosk/views/PackageSlotSelectView.tsx:197:70`
   - `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.

4. **`react/no-unescaped-entities`** — `modules/kiosk/views/PackageSlotSelectView.tsx:197:91`
   - `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.

5. **`prefer-const`** — `modules/navigation/components/map/BuildingMapCanvas.tsx:507:11`
   - 'halfW' is never reassigned. Use 'const' instead.

6. **`prefer-const`** — `modules/navigation/components/map/BuildingMapCanvas.tsx:508:11`
   - 'halfH' is never reassigned. Use 'const' instead.

7. **`prefer-const`** — `modules/navigation/components/map/BuildingMapCanvas.tsx:725:9`
   - 'halfW' is never reassigned. Use 'const' instead.

8. **`prefer-const`** — `modules/navigation/components/map/BuildingMapCanvas.tsx:726:9`
   - 'halfH' is never reassigned. Use 'const' instead.

9. **`react-hooks/immutability`** — `modules/payment/components/PaymentWorkflowPanel.tsx:300:25`
   - Error: Cannot access variable before it is declared

10. **`(parse)`** — `scratch/ReceptionSearchForm_original.tsx:1:0`
   - Parsing error: File appears to be binary.

11. **`@typescript-eslint/no-require-imports`** — `scratch/test-api.js:1:15`
   - A `require()` style import is forbidden.

## Warnings by rule (408)

- 172 × `@typescript-eslint/no-explicit-any`
- 169 × `@typescript-eslint/no-unused-vars`
- 25 × `react-hooks/set-state-in-effect`
- 21 × `react-hooks/refs`
- 12 × `react-hooks/exhaustive-deps`
- 8 × `@next/next/no-img-element`
- 1 × `@typescript-eslint/no-empty-object-type`

## All warnings

| # | Rule | File | Line | Message |
|---|------|------|------|--------|
| 1 | `@next/next/no-img-element` | `app/(staff)/nurse/setting/page.tsx` | 128 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 2 | `@typescript-eslint/no-unused-vars` | `app/(staff)/pharmacy/patients/page.tsx` | 5 | 'Clock' is defined but never used. |
| 3 | `@typescript-eslint/no-unused-vars` | `app/(staff)/pharmacy/patients/page.tsx` | 5 | 'CreditCard' is defined but never used. |
| 4 | `@typescript-eslint/no-unused-vars` | `app/(staff)/pharmacy/patients/page.tsx` | 5 | 'AlertCircle' is defined but never used. |
| 5 | `@typescript-eslint/no-unused-vars` | `app/(staff)/pharmacy/patients/page.tsx` | 5 | 'User' is defined but never used. |
| 6 | `react-hooks/set-state-in-effect` | `app/(staff)/pharmacy/patients/page.tsx` | 30 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 7 | `@typescript-eslint/no-explicit-any` | `app/(staff)/pharmacy/patients/page.tsx` | 45 | Unexpected any. Specify a different type. |
| 8 | `@typescript-eslint/no-explicit-any` | `app/(staff)/pharmacy/patients/page.tsx` | 59 | Unexpected any. Specify a different type. |
| 9 | `@typescript-eslint/no-unused-vars` | `app/(staff)/pharmacy/patients/page.tsx` | 224 | 'isDispensed' is assigned a value but never used. |
| 10 | `@typescript-eslint/no-explicit-any` | `app/api/translate/route.ts` | 86 | Unexpected any. Specify a different type. |
| 11 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 5 | 'Filter' is defined but never used. |
| 12 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 6 | 'Star' is defined but never used. |
| 13 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 6 | 'X' is defined but never used. |
| 14 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 7 | 'Send' is defined but never used. |
| 15 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 7 | 'Copy' is defined but never used. |
| 16 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 7 | 'ExternalLink' is defined but never used. |
| 17 | `@typescript-eslint/no-unused-vars` | `app/design-system/page.tsx` | 24 | 'BottomNav' is defined but never used. |
| 18 | `react-hooks/set-state-in-effect` | `modules/admin/components/AdminMapPage.tsx` | 228 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 19 | `react-hooks/refs` | `modules/admin/components/AdminMapPage.tsx` | 430 | Error: Cannot access refs during render |
| 20 | `react-hooks/set-state-in-effect` | `modules/admin/components/AdminServicesPage.tsx` | 68 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 21 | `@typescript-eslint/no-unused-vars` | `modules/admin/store/processStore.ts` | 53 | '_parentTemplateId' is defined but never used. |
| 22 | `@typescript-eslint/no-unused-vars` | `modules/admin/utils/shiftValidation.ts` | 6 | '_shift' is defined but never used. |
| 23 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 11 | 'User' is defined but never used. |
| 24 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 16 | 'QrCode' is defined but never used. |
| 25 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 18 | 'ShieldCheck' is defined but never used. |
| 26 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 19 | 'Sparkles' is defined but never used. |
| 27 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 23 | 'Banknote' is defined but never used. |
| 28 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 27 | 'PharmacyPayOsPanel' is defined but never used. |
| 29 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 40 | 'router' is assigned a value but never used. |
| 30 | `react-hooks/set-state-in-effect` | `modules/ancillary/components/MedicationDispense.tsx` | 47 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 31 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicationDispense.tsx` | 91 | 'handlePayOffline' is assigned a value but never used. |
| 32 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/MedicationDispense.tsx` | 107 | Unexpected any. Specify a different type. |
| 33 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/MedicationDispense.tsx` | 122 | Unexpected any. Specify a different type. |
| 34 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/MedicationDispense.tsx` | 137 | Unexpected any. Specify a different type. |
| 35 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/MedicineCatalogModal.tsx` | 15 | 'FileText' is defined but never used. |
| 36 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/MedicineCatalogModal.tsx` | 63 | Unexpected any. Specify a different type. |
| 37 | `react-hooks/set-state-in-effect` | `modules/ancillary/components/MedicineCatalogModal.tsx` | 72 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 38 | `react-hooks/exhaustive-deps` | `modules/ancillary/components/MedicineCatalogModal.tsx` | 74 | React Hook useEffect has a missing dependency: 'fetchMedicines'. Either include it or remove the dependency array. |
| 39 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/MedicineCatalogModal.tsx` | 109 | Unexpected any. Specify a different type. |
| 40 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 17 | 'ShieldCheck' is defined but never used. |
| 41 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 112 | Unexpected any. Specify a different type. |
| 42 | `react-hooks/exhaustive-deps` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 150 | React Hook useEffect has missing dependencies: 'prescription.patient_code', 'prescription.patient_name', 'prescription.prescriptionDetails', and 'transferMemo'. Either include them or remove the depen |
| 43 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 159 | 'e' is defined but never used. |
| 44 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 175 | Unexpected any. Specify a different type. |
| 45 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 190 | Unexpected any. Specify a different type. |
| 46 | `@next/next/no-img-element` | `modules/ancillary/components/PharmacyPayOsPanel.tsx` | 307 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 47 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyQueue.tsx` | 5 | 'Search' is defined but never used. |
| 48 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyQueue.tsx` | 7 | 'Filter' is defined but never used. |
| 49 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyQueue.tsx` | 15 | 'ChevronRight' is defined but never used. |
| 50 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyQueue.tsx` | 16 | 'ArrowRight' is defined but never used. |
| 51 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/components/PharmacyQueue.tsx` | 35 | 'setSearchQuery' is assigned a value but never used. |
| 52 | `react-hooks/set-state-in-effect` | `modules/ancillary/components/PharmacyQueue.tsx` | 58 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 53 | `react-hooks/exhaustive-deps` | `modules/ancillary/components/PharmacyQueue.tsx` | 76 | React Hook useEffect has a missing dependency: 'prescriptions.length'. Either include it or remove the dependency array. |
| 54 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/components/PharmacyQueue.tsx` | 102 | Unexpected any. Specify a different type. |
| 55 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/medicineService.ts` | 114 | Unexpected any. Specify a different type. |
| 56 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/medicineService.ts` | 115 | Unexpected any. Specify a different type. |
| 57 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/medicineService.ts` | 147 | Unexpected any. Specify a different type. |
| 58 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 56 | Unexpected any. Specify a different type. |
| 59 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 139 | Unexpected any. Specify a different type. |
| 60 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 433 | Unexpected any. Specify a different type. |
| 61 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 486 | Unexpected any. Specify a different type. |
| 62 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 487 | Unexpected any. Specify a different type. |
| 63 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 517 | Unexpected any. Specify a different type. |
| 64 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 525 | Unexpected any. Specify a different type. |
| 65 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 526 | Unexpected any. Specify a different type. |
| 66 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 565 | Unexpected any. Specify a different type. |
| 67 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 566 | Unexpected any. Specify a different type. |
| 68 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 612 | Unexpected any. Specify a different type. |
| 69 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 613 | Unexpected any. Specify a different type. |
| 70 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 653 | Unexpected any. Specify a different type. |
| 71 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 654 | Unexpected any. Specify a different type. |
| 72 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 692 | Unexpected any. Specify a different type. |
| 73 | `@typescript-eslint/no-explicit-any` | `modules/ancillary/services/pharmacyService.ts` | 693 | Unexpected any. Specify a different type. |
| 74 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/types/ancillary.types.ts` | 3 | 'Prescription' is defined but never used. |
| 75 | `@typescript-eslint/no-unused-vars` | `modules/ancillary/types/ancillary.types.ts` | 3 | 'Medicine' is defined but never used. |
| 76 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/ClinicalProcessPanel.tsx` | 53 | '_labOrders' is defined but never used. |
| 77 | `react-hooks/set-state-in-effect` | `modules/clinical/components/DoctorDashboard.tsx` | 114 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 78 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 6 | 'Plus' is defined but never used. |
| 79 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 12 | 'FileText' is defined but never used. |
| 80 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 13 | 'DollarSign' is defined but never used. |
| 81 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 14 | 'QrCode' is defined but never used. |
| 82 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 15 | 'Calendar' is defined but never used. |
| 83 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 38 | 'patientName' is defined but never used. |
| 84 | `react-hooks/set-state-in-effect` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 54 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 85 | `@typescript-eslint/no-explicit-any` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 99 | Unexpected any. Specify a different type. |
| 86 | `@typescript-eslint/no-explicit-any` | `modules/clinical/components/DoctorPrescriptionTab.tsx` | 136 | Unexpected any. Specify a different type. |
| 87 | `react-hooks/set-state-in-effect` | `modules/clinical/components/ParaclinicalOrdersTab.tsx` | 234 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 88 | `react-hooks/set-state-in-effect` | `modules/clinical/components/ParaclinicalOrdersTab.tsx` | 256 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 89 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/WorkflowDiagram.tsx` | 154 | 'titleCaseFirstChar' is defined but never used. |
| 90 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/WorkflowDiagram.tsx` | 763 | 'paymentTargetKey' is assigned a value but never used. |
| 91 | `@typescript-eslint/no-unused-vars` | `modules/clinical/components/WorkflowDiagram.tsx` | 768 | 'serviceKey' is assigned a value but never used. |
| 92 | `react-hooks/set-state-in-effect` | `modules/clinical/components/WorkflowDiagram.tsx` | 1877 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 93 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/PaymentQrModal.tsx` | 2 | 'CheckCircle' is defined but never used. |
| 94 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/PaymentQrModal.tsx` | 3 | 'TransactionQrResult' is defined but never used. |
| 95 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/PaymentQrModal.tsx` | 30 | 'isVerifying' is assigned a value but never used. |
| 96 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/PaymentQrModal.tsx` | 30 | 'setIsVerifying' is assigned a value but never used. |
| 97 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/components/PaymentQrModal.tsx` | 45 | Unexpected any. Specify a different type. |
| 98 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/components/PaymentQrModal.tsx` | 52 | Unexpected any. Specify a different type. |
| 99 | `@next/next/no-img-element` | `modules/kiosk/components/PaymentQrModal.tsx` | 97 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 100 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleBack.tsx` | 136 | 'className' is defined but never used. |
| 101 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleBack.tsx` | 138 | 'selectedPart' is assigned a value but never used. |
| 102 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleBack.tsx` | 140 | 'closePopup' is assigned a value but never used. |
| 103 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleBack.tsx` | 202 | 'popupStyle' is assigned a value but never used. |
| 104 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleBack.tsx` | 215 | 'buttonStyle' is assigned a value but never used. |
| 105 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleFront.tsx` | 197 | 'className' is defined but never used. |
| 106 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleFront.tsx` | 199 | 'selectedPart' is assigned a value but never used. |
| 107 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleFront.tsx` | 201 | 'closePopup' is assigned a value but never used. |
| 108 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleFront.tsx` | 263 | 'popupStyle' is assigned a value but never used. |
| 109 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/FemaleFront.tsx` | 276 | 'buttonStyle' is assigned a value but never used. |
| 110 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleBack.tsx` | 144 | 'className' is defined but never used. |
| 111 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleBack.tsx` | 146 | 'selectedPart' is assigned a value but never used. |
| 112 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleBack.tsx` | 148 | 'closePopup' is assigned a value but never used. |
| 113 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleBack.tsx` | 209 | 'popupStyle' is assigned a value but never used. |
| 114 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleBack.tsx` | 222 | 'buttonStyle' is assigned a value but never used. |
| 115 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleFront.tsx` | 169 | 'className' is defined but never used. |
| 116 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleFront.tsx` | 171 | 'selectedPart' is assigned a value but never used. |
| 117 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleFront.tsx` | 173 | 'closePopup' is assigned a value but never used. |
| 118 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleFront.tsx` | 258 | 'popupStyle' is assigned a value but never used. |
| 119 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/body-maps/MaleFront.tsx` | 271 | 'buttonStyle' is assigned a value but never used. |
| 120 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/components/register/DoctorSelectStep.tsx` | 4 | 'User' is defined but never used. |
| 121 | `@next/next/no-img-element` | `modules/kiosk/components/register/DoctorSelectStep.tsx` | 96 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 122 | `react-hooks/set-state-in-effect` | `modules/kiosk/components/register/QuizDetailStep.tsx` | 14 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 123 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/components/register/QuizDetailStep.tsx` | 18 | Unexpected any. Specify a different type. |
| 124 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/components/register/QuizDetailStep.tsx` | 54 | Unexpected any. Specify a different type. |
| 125 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/components/register/QuizDetailStep.tsx` | 75 | Unexpected any. Specify a different type. |
| 126 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/components/register/QuizDetailStep.tsx` | 84 | Unexpected any. Specify a different type. |
| 127 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/modals/QRScannerModal.tsx` | 48 | 'e' is defined but never used. |
| 128 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 2 | 'CheckCircle' is defined but never used. |
| 129 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 30 | 'isVerifying' is assigned a value but never used. |
| 130 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 30 | 'setIsVerifying' is assigned a value but never used. |
| 131 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 41 | Unexpected any. Specify a different type. |
| 132 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 44 | Unexpected any. Specify a different type. |
| 133 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 47 | Unexpected any. Specify a different type. |
| 134 | `@next/next/no-img-element` | `modules/kiosk/modals/ServicePaymentQrModal.tsx` | 92 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 135 | `react-hooks/set-state-in-effect` | `modules/kiosk/modals/SymptomSelectorModal.tsx` | 33 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 136 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/services/flowService.ts` | 9 | 'ServiceItem' is defined but never used. |
| 137 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/services/flowService.ts` | 10 | 'TransactionQrResult' is defined but never used. |
| 138 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/services/flowService.ts` | 38 | Unexpected any. Specify a different type. |
| 139 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 34 | Unexpected any. Specify a different type. |
| 140 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 34 | Unexpected any. Specify a different type. |
| 141 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 35 | Unexpected any. Specify a different type. |
| 142 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 36 | Unexpected any. Specify a different type. |
| 143 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 37 | Unexpected any. Specify a different type. |
| 144 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 64 | Unexpected any. Specify a different type. |
| 145 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 64 | Unexpected any. Specify a different type. |
| 146 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 65 | Unexpected any. Specify a different type. |
| 147 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 66 | Unexpected any. Specify a different type. |
| 148 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/authStore.ts` | 67 | Unexpected any. Specify a different type. |
| 149 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/billPaymentSlice.ts` | 61 | Unexpected any. Specify a different type. |
| 150 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/billPaymentSlice.ts` | 61 | Unexpected any. Specify a different type. |
| 151 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/billPaymentSlice.ts` | 67 | Unexpected any. Specify a different type. |
| 152 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/billPaymentSlice.ts` | 109 | Unexpected any. Specify a different type. |
| 153 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/billPaymentSlice.ts` | 151 | Unexpected any. Specify a different type. |
| 154 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 37 | Unexpected any. Specify a different type. |
| 155 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 41 | Unexpected any. Specify a different type. |
| 156 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 61 | Unexpected any. Specify a different type. |
| 157 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 76 | Unexpected any. Specify a different type. |
| 158 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 91 | Unexpected any. Specify a different type. |
| 159 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/bookingStore.ts` | 105 | 'flowStore' is assigned a value but never used. |
| 160 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 129 | Unexpected any. Specify a different type. |
| 161 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/bookingStore.ts` | 137 | 'e' is defined but never used. |
| 162 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/bookingStore.ts` | 149 | 'flowStore' is assigned a value but never used. |
| 163 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/bookingStore.ts` | 172 | Unexpected any. Specify a different type. |
| 164 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 2 | 'PaymentBill' is defined but never used. |
| 165 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 2 | 'PaymentMethod' is defined but never used. |
| 166 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 2 | 'RouteStepItem' is defined but never used. |
| 167 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 3 | 'BookingPaymentData' is defined but never used. |
| 168 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 4 | 'PendingPaymentStep' is defined but never used. |
| 169 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 4 | 'ServiceOrder' is defined but never used. |
| 170 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/flowStore.ts` | 4 | 'TransactionQrResult' is defined but never used. |
| 171 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/flowStore.ts` | 58 | Unexpected any. Specify a different type. |
| 172 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/flowStore.ts` | 100 | Unexpected any. Specify a different type. |
| 173 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 57 | Unexpected any. Specify a different type. |
| 174 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 59 | Unexpected any. Specify a different type. |
| 175 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 80 | Unexpected any. Specify a different type. |
| 176 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 82 | Unexpected any. Specify a different type. |
| 177 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 101 | Unexpected any. Specify a different type. |
| 178 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 106 | Unexpected any. Specify a different type. |
| 179 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/packageBookingStore.ts` | 125 | 'selectedPackageDetail' is assigned a value but never used. |
| 180 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 152 | Unexpected any. Specify a different type. |
| 181 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/packageBookingStore.ts` | 166 | Unexpected any. Specify a different type. |
| 182 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/serviceOrderSlice.ts` | 29 | Unexpected any. Specify a different type. |
| 183 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 24 | Unexpected any. Specify a different type. |
| 184 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 38 | Unexpected any. Specify a different type. |
| 185 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 46 | Unexpected any. Specify a different type. |
| 186 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 57 | Unexpected any. Specify a different type. |
| 187 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 64 | Unexpected any. Specify a different type. |
| 188 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 65 | Unexpected any. Specify a different type. |
| 189 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 67 | Unexpected any. Specify a different type. |
| 190 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 69 | Unexpected any. Specify a different type. |
| 191 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 69 | Unexpected any. Specify a different type. |
| 192 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 91 | Unexpected any. Specify a different type. |
| 193 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 140 | Unexpected any. Specify a different type. |
| 194 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 143 | Unexpected any. Specify a different type. |
| 195 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 147 | Unexpected any. Specify a different type. |
| 196 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 147 | Unexpected any. Specify a different type. |
| 197 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 147 | Unexpected any. Specify a different type. |
| 198 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 157 | Unexpected any. Specify a different type. |
| 199 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 159 | Unexpected any. Specify a different type. |
| 200 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 159 | Unexpected any. Specify a different type. |
| 201 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 174 | Unexpected any. Specify a different type. |
| 202 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 177 | Unexpected any. Specify a different type. |
| 203 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 180 | Unexpected any. Specify a different type. |
| 204 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/ticketSlice.ts` | 213 | Unexpected any. Specify a different type. |
| 205 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 21 | Unexpected any. Specify a different type. |
| 206 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 23 | Unexpected any. Specify a different type. |
| 207 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/store/triageStore.ts` | 33 | 'GLOBAL_STATIC_SYMPTOM_MAP' is assigned a value but never used. |
| 208 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 40 | Unexpected any. Specify a different type. |
| 209 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 43 | Unexpected any. Specify a different type. |
| 210 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 110 | Unexpected any. Specify a different type. |
| 211 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 213 | Unexpected any. Specify a different type. |
| 212 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 231 | Unexpected any. Specify a different type. |
| 213 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 286 | Unexpected any. Specify a different type. |
| 214 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/store/triageStore.ts` | 304 | Unexpected any. Specify a different type. |
| 215 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/types/flow.types.ts` | 48 | Unexpected any. Specify a different type. |
| 216 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/types/flow.types.ts` | 121 | Unexpected any. Specify a different type. |
| 217 | `@typescript-eslint/no-empty-object-type` | `modules/kiosk/types/flow.types.ts` | 124 | An interface declaring no members is equivalent to its supertype. |
| 218 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/types/packageBooking.types.ts` | 16 | Unexpected any. Specify a different type. |
| 219 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/types/triage.types.ts` | 31 | Unexpected any. Specify a different type. |
| 220 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/types/triage.types.ts` | 42 | Unexpected any. Specify a different type. |
| 221 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 7 | Unexpected any. Specify a different type. |
| 222 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 8 | Unexpected any. Specify a different type. |
| 223 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 10 | Unexpected any. Specify a different type. |
| 224 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 16 | Unexpected any. Specify a different type. |
| 225 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 30 | Unexpected any. Specify a different type. |
| 226 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 36 | Unexpected any. Specify a different type. |
| 227 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 50 | Unexpected any. Specify a different type. |
| 228 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 50 | Unexpected any. Specify a different type. |
| 229 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 51 | Unexpected any. Specify a different type. |
| 230 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 55 | Unexpected any. Specify a different type. |
| 231 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 94 | Unexpected any. Specify a different type. |
| 232 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 94 | Unexpected any. Specify a different type. |
| 233 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 130 | Unexpected any. Specify a different type. |
| 234 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/utils/flowHelpers.ts` | 168 | Unexpected any. Specify a different type. |
| 235 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/utils/symptomMapper.ts` | 1 | 'Symptom' is defined but never used. |
| 236 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/BookingModeView.tsx` | 5 | 'Stethoscope' is defined but never used. |
| 237 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/DoctorRouteView.tsx` | 23 | 'selectedDoctor' is assigned a value but never used. |
| 238 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/views/DoctorRouteView.tsx` | 81 | Unexpected any. Specify a different type. |
| 239 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/MapView.tsx` | 5 | 'useFlowStore' is defined but never used. |
| 240 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/views/MapView.tsx` | 33 | Unexpected any. Specify a different type. |
| 241 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/views/MapView.tsx` | 63 | Unexpected any. Specify a different type. |
| 242 | `@typescript-eslint/no-explicit-any` | `modules/kiosk/views/MapView.tsx` | 84 | Unexpected any. Specify a different type. |
| 243 | `react-hooks/set-state-in-effect` | `modules/kiosk/views/MapView.tsx` | 98 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 244 | `react-hooks/set-state-in-effect` | `modules/kiosk/views/MapView.tsx` | 112 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 245 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PackageDetailView.tsx` | 4 | 'CheckCircle2' is defined but never used. |
| 246 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PackageSelectView.tsx` | 4 | 'BriefcaseMedical' is defined but never used. |
| 247 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PackageSelectView.tsx` | 8 | 'goHome' is assigned a value but never used. |
| 248 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PatientInfoView.tsx` | 5 | 'MapPin' is defined but never used. |
| 249 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PatientInfoView.tsx` | 11 | 'CheckCircle2' is defined but never used. |
| 250 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PatientInfoView.tsx` | 12 | 'QrCode' is defined but never used. |
| 251 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PatientInfoView.tsx` | 37 | 'currentCallingNo' is assigned a value but never used. |
| 252 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PaymentView.tsx` | 6 | 'QrCode' is defined but never used. |
| 253 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/PendingBillsView.tsx` | 7 | 'CreditCard' is defined but never used. |
| 254 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/QueueView.tsx` | 10 | 'navigateToView' is assigned a value but never used. |
| 255 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/QueueView.tsx` | 20 | 'callingNo' is assigned a value but never used. |
| 256 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/SpecialtySelectView.tsx` | 11 | 'Activity' is defined but never used. |
| 257 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/SpecialtySelectView.tsx` | 20 | 'Sparkles' is defined but never used. |
| 258 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/SupportView.tsx` | 4 | 'ArrowLeft' is defined but never used. |
| 259 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/SupportView.tsx` | 4 | 'FileText' is defined but never used. |
| 260 | `@typescript-eslint/no-unused-vars` | `modules/kiosk/views/SupportView.tsx` | 4 | 'Info' is defined but never used. |
| 261 | `@typescript-eslint/no-unused-vars` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 151 | 'geometryTool' is assigned a value but never used. |
| 262 | `@typescript-eslint/no-unused-vars` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 166 | 'activeFloor' is assigned a value but never used. |
| 263 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 216 | Error: Cannot access refs during render |
| 264 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 217 | Error: Cannot access refs during render |
| 265 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 218 | Error: Cannot access refs during render |
| 266 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 219 | Error: Cannot access refs during render |
| 267 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 220 | Error: Cannot access refs during render |
| 268 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 221 | Error: Cannot access refs during render |
| 269 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 222 | Error: Cannot access refs during render |
| 270 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 223 | Error: Cannot access refs during render |
| 271 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 229 | Error: Cannot access refs during render |
| 272 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 230 | Error: Cannot access refs during render |
| 273 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 231 | Error: Cannot access refs during render |
| 274 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 232 | Error: Cannot access refs during render |
| 275 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 233 | Error: Cannot access refs during render |
| 276 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 234 | Error: Cannot access refs during render |
| 277 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 235 | Error: Cannot access refs during render |
| 278 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 236 | Error: Cannot access refs during render |
| 279 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 237 | Error: Cannot access refs during render |
| 280 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 238 | Error: Cannot access refs during render |
| 281 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 239 | Error: Cannot access refs during render |
| 282 | `react-hooks/refs` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 242 | Error: Cannot access refs during render |
| 283 | `@typescript-eslint/no-explicit-any` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 330 | Unexpected any. Specify a different type. |
| 284 | `@typescript-eslint/no-explicit-any` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 346 | Unexpected any. Specify a different type. |
| 285 | `react-hooks/exhaustive-deps` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 399 | React Hook useEffect has missing dependencies: 'activeHighlightId' and 'applyFloorColors'. Either include them or remove the dependency array. |
| 286 | `react-hooks/exhaustive-deps` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 452 | React Hook useEffect has a missing dependency: 'drawRoutePath'. Either include it or remove the dependency array. |
| 287 | `react-hooks/exhaustive-deps` | `modules/navigation/components/map/BuildingMapCanvas.tsx` | 1184 | React Hook useEffect has missing dependencies: 'apiFloor', 'applyFloorColors', 'drawRouteLine', 'drawRoutePath', 'highlightAreaId', 'highlightRoomCode', and 'highlightedRoomId'. Either include them or |
| 288 | `react-hooks/set-state-in-effect` | `modules/navigation/hooks/useWayfinding.ts` | 82 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 289 | `@typescript-eslint/no-explicit-any` | `modules/navigation/types/navigation.types.ts` | 43 | Unexpected any. Specify a different type. |
| 290 | `@typescript-eslint/no-explicit-any` | `modules/navigation/types/navigation.types.ts` | 66 | Unexpected any. Specify a different type. |
| 291 | `@typescript-eslint/no-unused-vars` | `modules/navigation/utils/buildingToThree.ts` | 1 | 'ApiDoor' is defined but never used. |
| 292 | `@typescript-eslint/no-unused-vars` | `modules/navigation/utils/buildingToThree.ts` | 1 | 'ApiArea' is defined but never used. |
| 293 | `@typescript-eslint/no-unused-vars` | `modules/notifications/components/NotificationPanel.tsx` | 8 | 'Check' is defined but never used. |
| 294 | `@typescript-eslint/no-unused-vars` | `modules/notifications/components/NotificationPanel.tsx` | 10 | 'Settings' is defined but never used. |
| 295 | `@typescript-eslint/no-unused-vars` | `modules/notifications/components/NotificationPanel.tsx` | 11 | 'X' is defined but never used. |
| 296 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PatientPaymentDisplay.tsx` | 5 | 'QrCode' is defined but never used. |
| 297 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PatientPaymentDisplay.tsx` | 17 | 'Sparkles' is defined but never used. |
| 298 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PatientPaymentDisplay.tsx` | 20 | 'Receipt' is defined but never used. |
| 299 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PatientPaymentDisplay.tsx` | 86 | 'insuranceAmount' is assigned a value but never used. |
| 300 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PatientPaymentDisplay.tsx` | 152 | 'e' is defined but never used. |
| 301 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PatientPaymentDisplay.tsx` | 173 | 'err' is defined but never used. |
| 302 | `react-hooks/set-state-in-effect` | `modules/payment/components/PatientPaymentDisplay.tsx` | 202 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 303 | `@typescript-eslint/no-explicit-any` | `modules/payment/components/PatientPaymentDisplay.tsx` | 224 | Unexpected any. Specify a different type. |
| 304 | `@next/next/no-img-element` | `modules/payment/components/PatientPaymentDisplay.tsx` | 594 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 305 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 9 | 'CheckCircle2' is defined but never used. |
| 306 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 11 | 'Shield' is defined but never used. |
| 307 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 16 | 'User' is defined but never used. |
| 308 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 19 | 'Printer' is defined but never used. |
| 309 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 20 | 'Sparkles' is defined but never used. |
| 310 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 24 | 'Search' is defined but never used. |
| 311 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 62 | 'router' is assigned a value but never used. |
| 312 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 71 | 'searchQuery' is assigned a value but never used. |
| 313 | `react-hooks/set-state-in-effect` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 130 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 314 | `react-hooks/exhaustive-deps` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 131 | React Hook useEffect has a missing dependency: 'fetchLivePrescriptions'. Either include it or remove the dependency array. |
| 315 | `react-hooks/set-state-in-effect` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 145 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 316 | `react-hooks/exhaustive-deps` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 147 | React Hook useEffect has a missing dependency: 'activePatient'. Either include it or remove the dependency array. |
| 317 | `@typescript-eslint/no-explicit-any` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 308 | Unexpected any. Specify a different type. |
| 318 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 319 | 'err' is defined but never used. |
| 319 | `react-hooks/exhaustive-deps` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 325 | React Hook useEffect has a missing dependency: 'handleConfirmPayment'. Either include it or remove the dependency array. |
| 320 | `@typescript-eslint/no-unused-vars` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 327 | 'handleProceedToStep2' is assigned a value but never used. |
| 321 | `@typescript-eslint/no-explicit-any` | `modules/payment/components/PaymentWorkflowPanel.tsx` | 351 | Unexpected any. Specify a different type. |
| 322 | `@typescript-eslint/no-unused-vars` | `modules/payment/services/paymentService.ts` | 2 | 'PaymentStatusEnum' is defined but never used. |
| 323 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 10 | Unexpected any. Specify a different type. |
| 324 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 18 | Unexpected any. Specify a different type. |
| 325 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 35 | Unexpected any. Specify a different type. |
| 326 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 37 | Unexpected any. Specify a different type. |
| 327 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 78 | Unexpected any. Specify a different type. |
| 328 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 80 | Unexpected any. Specify a different type. |
| 329 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 99 | Unexpected any. Specify a different type. |
| 330 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 107 | Unexpected any. Specify a different type. |
| 331 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 129 | Unexpected any. Specify a different type. |
| 332 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 131 | Unexpected any. Specify a different type. |
| 333 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 151 | Unexpected any. Specify a different type. |
| 334 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 153 | Unexpected any. Specify a different type. |
| 335 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 168 | Unexpected any. Specify a different type. |
| 336 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 169 | Unexpected any. Specify a different type. |
| 337 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 175 | Unexpected any. Specify a different type. |
| 338 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 192 | Unexpected any. Specify a different type. |
| 339 | `@typescript-eslint/no-explicit-any` | `modules/payment/services/paymentService.ts` | 217 | Unexpected any. Specify a different type. |
| 340 | `@typescript-eslint/no-explicit-any` | `modules/queue/components/RoomWaitingScreen.tsx` | 45 | Unexpected any. Specify a different type. |
| 341 | `@typescript-eslint/no-explicit-any` | `modules/queue/components/RoomWaitingScreen.tsx` | 67 | Unexpected any. Specify a different type. |
| 342 | `react-hooks/set-state-in-effect` | `modules/queue/components/RoomWaitingScreen.tsx` | 91 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 343 | `@typescript-eslint/no-explicit-any` | `modules/queue/components/RoomWaitingScreen.tsx` | 128 | Unexpected any. Specify a different type. |
| 344 | `@typescript-eslint/no-explicit-any` | `modules/queue/components/RoomWaitingScreen.tsx` | 137 | Unexpected any. Specify a different type. |
| 345 | `react-hooks/set-state-in-effect` | `modules/queue/hooks/useRoomDisplay.ts` | 62 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 346 | `@typescript-eslint/no-unused-vars` | `modules/queue/hooks/useRoomDisplaySocket.ts` | 7 | 'roomDisplayService' is defined but never used. |
| 347 | `@typescript-eslint/no-unused-vars` | `modules/queue/hooks/useRoomDisplaySocket.ts` | 8 | 'useAuthStore' is defined but never used. |
| 348 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/CccdQrScanner.tsx` | 283 | Unexpected any. Specify a different type. |
| 349 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/PayOsPaymentPanel.tsx` | 25 | 'isChecking' is assigned a value but never used. |
| 350 | `react-hooks/set-state-in-effect` | `modules/reception/components/PayOsPaymentPanel.tsx` | 112 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 351 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/PayOsPaymentPanel.tsx` | 121 | 'handleManualConfirmPayment' is assigned a value but never used. |
| 352 | `@next/next/no-img-element` | `modules/reception/components/PayOsPaymentPanel.tsx` | 238 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 353 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionPaymentForm.tsx` | 80 | 'origin' is assigned a value but never used. |
| 354 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionRegisterForm.tsx` | 15 | 'Clock' is defined but never used. |
| 355 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionRegisterForm.tsx` | 16 | 'Wallet' is defined but never used. |
| 356 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionRegisterForm.tsx` | 17 | 'ExternalLink' is defined but never used. |
| 357 | `react-hooks/set-state-in-effect` | `modules/reception/components/ReceptionRegisterForm.tsx` | 231 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 358 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/ReceptionRegisterForm.tsx` | 294 | Unexpected any. Specify a different type. |
| 359 | `react-hooks/set-state-in-effect` | `modules/reception/components/ReceptionRegisterForm.tsx` | 354 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 360 | `react-hooks/exhaustive-deps` | `modules/reception/components/ReceptionRegisterForm.tsx` | 356 | React Hook useEffect has a missing dependency: 'handleQrPaymentSelected'. Either include it or remove the dependency array. |
| 361 | `react-hooks/exhaustive-deps` | `modules/reception/components/ReceptionRegisterForm.tsx` | 600 | React Hook useEffect has a missing dependency: 'lookupPatientByCitizen'. Either include it or remove the dependency array. |
| 362 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/ReceptionRegisterForm.tsx` | 761 | Unexpected any. Specify a different type. |
| 363 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/ReceptionRegisterForm.tsx` | 1209 | Unexpected any. Specify a different type. |
| 364 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/ReceptionRegisterForm.tsx` | 1210 | Unexpected any. Specify a different type. |
| 365 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/ReceptionRegisterForm.tsx` | 1211 | Unexpected any. Specify a different type. |
| 366 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionSearchForm.tsx` | 11 | 'UserPlus' is defined but never used. |
| 367 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionSearchForm.tsx` | 19 | 'Pencil' is defined but never used. |
| 368 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionSearchForm.tsx` | 21 | 'Plus' is defined but never used. |
| 369 | `@typescript-eslint/no-explicit-any` | `modules/reception/components/ReceptionSearchForm.tsx` | 361 | Unexpected any. Specify a different type. |
| 370 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/ReceptionStatsView.tsx` | 72 | 'setWalkInRate' is assigned a value but never used. |
| 371 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/RegisterConfirmStep.tsx` | 72 | 'triageSession' is defined but never used. |
| 372 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/RegisterSuccessStep.tsx` | 6 | 'Clock' is defined but never used. |
| 373 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/RegisterSuccessStep.tsx` | 10 | 'MapPin' is defined but never used. |
| 374 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/RegisterSuccessStep.tsx` | 12 | 'Stethoscope' is defined but never used. |
| 375 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/RegisterSuccessStep.tsx` | 14 | 'Wallet' is defined but never used. |
| 376 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/RegisterSuccessStep.tsx` | 30 | 'DIRECTIONS' is assigned a value but never used. |
| 377 | `@next/next/no-img-element` | `modules/reception/components/RegisterSuccessStep.tsx` | 152 | Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage o |
| 378 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/SymptomTriageStep.tsx` | 179 | 'searchResults' is assigned a value but never used. |
| 379 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/SymptomTriageStep.tsx` | 180 | 'isSearching' is assigned a value but never used. |
| 380 | `@typescript-eslint/no-unused-vars` | `modules/reception/components/SymptomTriageStep.tsx` | 341 | 'appendSymptomSuggestion' is defined but never used. |
| 381 | `@typescript-eslint/no-explicit-any` | `modules/reception/services/deepseekTranslationService.ts` | 105 | Unexpected any. Specify a different type. |
| 382 | `@typescript-eslint/no-explicit-any` | `modules/reception/services/receptionService.ts` | 755 | Unexpected any. Specify a different type. |
| 383 | `@typescript-eslint/no-unused-vars` | `modules/reception/services/symptomTriageService.ts` | 7 | 'InfermedicaRecommendedSpecialist' is defined but never used. |
| 384 | `@typescript-eslint/no-unused-vars` | `modules/reception/services/symptomTriageService.ts` | 30 | 'localizeInfermedicaQuestion' is defined but never used. |
| 385 | `@typescript-eslint/no-unused-vars` | `modules/reception/services/vnptOcrServer.ts` | 61 | 'lastError' is assigned a value but never used. |
| 386 | `@typescript-eslint/no-explicit-any` | `modules/reception/utils/registerPrefill.ts` | 66 | Unexpected any. Specify a different type. |
| 387 | `@typescript-eslint/no-explicit-any` | `modules/reception/utils/registerPrefill.ts` | 78 | Unexpected any. Specify a different type. |
| 388 | `@typescript-eslint/no-unused-vars` | `modules/settings/components/SettingsWorkflowPanel.tsx` | 17 | 'Pill' is defined but never used. |
| 389 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 3 | 'useMemo' is defined but never used. |
| 390 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 15 | 'Check' is defined but never used. |
| 391 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 17 | 'Filter' is defined but never used. |
| 392 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 18 | 'ArrowUpDown' is defined but never used. |
| 393 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 19 | 'ArrowUp' is defined but never used. |
| 394 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 20 | 'ArrowDown' is defined but never used. |
| 395 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 21 | 'ChevronLeft' is defined but never used. |
| 396 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 22 | 'ChevronRight' is defined but never used. |
| 397 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 23 | 'RotateCcw' is defined but never used. |
| 398 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 25 | 'cn' is defined but never used. |
| 399 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 59 | 'moduleType' is assigned a value but never used. |
| 400 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 64 | 'isLoadingApi' is assigned a value but never used. |
| 401 | `@typescript-eslint/no-unused-vars` | `modules/shared/components/PatientCheckinPanel.tsx` | 68 | 'setToastMessage' is assigned a value but never used. |
| 402 | `@typescript-eslint/no-explicit-any` | `modules/shared/components/PatientCheckinPanel.tsx` | 70 | Unexpected any. Specify a different type. |
| 403 | `@typescript-eslint/no-explicit-any` | `modules/shared/components/PatientCheckinPanel.tsx` | 79 | Unexpected any. Specify a different type. |
| 404 | `react-hooks/set-state-in-effect` | `modules/shared/components/PatientCheckinPanel.tsx` | 149 | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 405 | `react-hooks/exhaustive-deps` | `modules/shared/components/PatientCheckinPanel.tsx` | 162 | React Hook useEffect has a missing dependency: 'loadApiPrescriptions'. Either include it or remove the dependency array. |
| 406 | `@typescript-eslint/no-unused-vars` | `shared/components/layout/Sidebar.tsx` | 25 | 'UserPlus' is defined but never used. |
| 407 | `@typescript-eslint/no-unused-vars` | `shared/components/layout/Sidebar.tsx` | 29 | 'FilePlus' is defined but never used. |
| 408 | `@typescript-eslint/no-explicit-any` | `shared/services/apiClient.ts` | 67 | Unexpected any. Specify a different type. |
