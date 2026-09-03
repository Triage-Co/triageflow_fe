import React from "react";
import { ShieldCheck, Lock, Smartphone, Database, HeartHandshake, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Chính sách Quyền riêng tư (Privacy Policy)
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Developer: <span className="font-semibold text-slate-700">Futulab</span> • App: <span className="font-semibold text-slate-700">TriageFlow (OPD)</span>
              </p>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm">
            Cập nhật lần cuối: 19/08/2026. Chúng tôi cam kết bảo vệ dữ liệu cá nhân và sự riêng tư của người dùng ứng dụng TriageFlow.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              1. Dữ liệu chúng tôi thu thập
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>Thông tin tài khoản:</strong> Họ tên, số điện thoại, địa chỉ email, số CCCD/Citizen ID.</li>
              <li><strong>Thông tin thiết bị:</strong> Mã định danh thiết bị (Device IDs), phiên bản hệ điều hành, nhằm quản lý phiên đăng nhập và gửi thông báo tiếp đón.</li>
              <li><strong>Hình ảnh eKYC:</strong> Ảnh chụp giấy tờ định danh (CCCD) để xác thực người bệnh trong luồng tiếp đón.</li>
              <li><strong>Thông tin sức khỏe & phân luồng:</strong> Triệu chứng ban đầu phục vụ quy trình đánh giá và phân luồng khám bệnh ngoại trú.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              2. Mục đích sử dụng và Mã hóa dữ liệu
            </h2>
            <p>
              Toàn bộ dữ liệu truyền tải giữa ứng dụng di động và hệ thống máy chủ đều được mã hóa bằng giao thức HTTPS/TLS bảo mật. Chúng tôi chỉ sử dụng dữ liệu để:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 mt-2">
              <li>Xác thực và duy trì tài khoản người bệnh.</li>
              <li>Tự động hóa luồng tiếp đón, hướng dẫn quy trình khám và thông báo số thứ tự.</li>
              <li>Đảm bảo tính chính xác và an toàn thông tin theo chuẩn y tế.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-blue-600" />
              3. Quyền của người dùng & Xoá dữ liệu
            </h2>
            <p>
              Người dùng có quyền yêu cầu xem, chỉnh sửa hoặc xoá bỏ tài khoản và dữ liệu cá nhân của mình bất kỳ lúc nào.
            </p>
            <p className="mt-2 flex items-center gap-1">
              <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Truy cập trang{" "}
              <Link href="/delete-account" className="text-blue-600 font-semibold underline">
                Yêu cầu xoá tài khoản TriageFlow
              </Link>{" "}
              để gửi yêu cầu trực tuyến.</span>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang chủ TriageFlow
          </Link>
        </div>
      </div>
    </main>
  );
}
