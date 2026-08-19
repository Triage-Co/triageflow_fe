"use client";

import React, { useState } from "react";
import { ShieldAlert, Trash2, CheckCircle2, Send, ArrowLeft, Building2, Smartphone, Lock } from "lucide-react";
import Link from "next/link";

export default function DeleteAccountPage() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Branding */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                TriageFlow – Account & Data Deletion
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Developer: <span className="font-semibold text-slate-700">Futulab</span> • App: <span className="font-semibold text-slate-700">TriageFlow (OPD)</span>
              </p>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            Chính sách và biểu mẫu hỗ trợ người dùng yêu cầu xoá tài khoản và toàn bộ dữ liệu cá nhân liên quan khỏi hệ thống <strong>TriageFlow</strong> theo tiêu chuẩn chính sách bảo mật người dùng của Google Play.
          </p>
        </div>

        {/* Form or Confirmation */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Yêu cầu xoá tài khoản trực tuyến
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Người dùng có thể gửi yêu cầu trực tiếp tại đây mà không cần phải cài đặt lại ứng dụng.
          </p>

          {submitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-emerald-900 mb-1">
                Đã tiếp nhận yêu cầu xoá tài khoản
              </h3>
              <p className="text-sm text-emerald-700 max-w-md mx-auto">
                Yêu cầu của bạn đối với tài khoản <strong>{emailOrPhone}</strong> đã được ghi nhận. Đội ngũ kỹ thuật Futulab sẽ xử lý và xoá vĩnh viễn dữ liệu trong vòng 7 - 14 ngày làm việc.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmailOrPhone("");
                  setReason("");
                }}
                className="mt-5 px-5 py-2 bg-white border border-emerald-300 text-emerald-800 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Gửi yêu cầu khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email hoặc Số điện thoại đăng ký tài khoản <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="ví dụ: user@example.com hoặc 0912345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lý do xoá tài khoản (Tuỳ chọn)
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Chia sẻ lý do nếu bạn muốn hỗ trợ chúng tôi cải thiện dịch vụ..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs sm:text-sm text-amber-800">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Lưu ý quan trọng:</strong> Hành động xoá tài khoản là không thể hoàn tác. Toàn bộ lịch sử tiếp đón, đặt lịch và thông tin cá nhân sẽ bị xoá vĩnh viễn khỏi ứng dụng.
                </p>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Gửi yêu cầu xoá dữ liệu
              </button>
            </form>
          )}
        </div>

        {/* Policy Details (Google Compliance Requirements) */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 text-sm text-slate-600">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              1. Quy trình các bước thực hiện xoá tài khoản
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>Cách 1 (Ngay trên ứng dụng di động):</strong> Vào mục <em>Hồ sơ (Profile) ➔ Cài đặt ➔ Yêu cầu xoá tài khoản</em>.</li>
              <li><strong>Cách 2 (Trên trang web này):</strong> Điền thông tin vào biểu mẫu phía trên hoặc gửi email đến <code>support@triageflow.me</code> với tiêu đề <em>"Yêu cầu xoá tài khoản TriageFlow"</em>.</li>
              <li>Hệ thống sẽ xác thực chủ sở hữu tài khoản qua mã OTP hoặc email xác nhận trước khi tiến hành xoá hoàn toàn.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              2. Các loại dữ liệu sẽ được xoá
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Thông tin tài khoản cá nhân: Họ tên, email, số điện thoại, mật khẩu mã hoá.</li>
              <li>Thông tin định danh thiết bị: Device ID, token thông báo đẩy (Push Token).</li>
              <li>Hình ảnh định danh eKYC đã tải lên trong phiên khám.</li>
              <li>Lịch sử phiên đăng nhập và cài đặt ứng dụng.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              3. Dữ liệu lưu giữ theo quy định pháp luật y tế
            </h3>
            <p className="leading-relaxed">
              Theo quy định của Luật Khám bệnh, chữa bệnh và quy định lưu trữ hồ sơ bệnh án y khoa, các dữ liệu chỉ định lâm sàng, kết quả xét nghiệm hoặc hoá đơn đã phát sinh trong các lượt khám tại bệnh viện sẽ được lưu giữ theo thời hạn luật định của cơ sở y tế và không bị xoá theo yêu cầu tài khoản cá nhân.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              4. Liên hệ bộ phận hỗ trợ
            </h3>
            <p>
              Nếu bạn có bất kỳ thắc mắc nào liên quan đến dữ liệu và quyền riêng tư, vui lòng liên hệ:
            </p>
            <p className="mt-1 font-medium text-slate-800">
              Nhà phát triển: Futulab • Email: support@triageflow.me
            </p>
          </div>
        </div>

        {/* Back Link */}
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
