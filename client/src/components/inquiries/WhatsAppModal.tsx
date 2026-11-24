import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { MessageSquare, ExternalLink, Send, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: {
    id: number;
    inquiry_id: string;
    student_name: string;
    mobile: string;
    course_name: string;
  } | null;
  onLogged?: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onLogged
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [message, setMessage] = useState('');
  const [logActivity, setLogActivity] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    if (!inquiry) return;

    const studentName = inquiry.student_name || 'Student';
    const courseName = inquiry.course_name || 'our professional program';

    switch (selectedTemplate) {
      case 'welcome':
        setMessage(
`Hello ${studentName},

Thank you for your interest in UniverseByte – Technology Redefined.

We received your inquiry regarding ${courseName}. Our team would be happy to guide you with the curriculum, hands-on projects, and upcoming batch details.

Please let us know a convenient time to connect.

Regards,
Team UniverseByte
Ahmedabad | +91 78598 20822
https://www.universebyte.in`
        );
        break;

      case 'followup':
        setMessage(
`Hello ${studentName},

Greetings from UniverseByte!

Following up on your inquiry for ${courseName}. Did you get a chance to review the course structure? We'd love to address any questions you have regarding batch schedules or fees.

Looking forward to connecting with you.

Warm regards,
Team UniverseByte`
        );
        break;

      case 'demo':
        setMessage(
`Hello ${studentName},

Exciting news from UniverseByte!

We are hosting an exclusive interactive Demo Session for ${courseName}. You will get to meet the mentor and see live project work in action.

Would you like us to reserve your free seat for the upcoming demo?

Best regards,
UniverseByte Admissions Team`
        );
        break;

      case 'custom':
        // Keep whatever staff wrote
        break;
    }
  }, [selectedTemplate, inquiry]);

  if (!inquiry) return null;

  const handleOpenWhatsApp = async () => {
    // Sanitize mobile for WhatsApp: 91XXXXXXXXXX
    let cleaned = inquiry.mobile.replace(/[\s\-\(\)\+]/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    const encodedText = encodeURIComponent(message.trim());
    const waUrl = `https://wa.me/${cleaned}?text=${encodedText}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // If logging enabled, record activity
    if (logActivity) {
      setIsLogging(true);
      try {
        await api.post(`/inquiries/${inquiry.id}/remarks`, {
          remarks: `Initiated WhatsApp chat with ${selectedTemplate} message.`,
          activity_type: 'WHATSAPP_INITIATED'
        });
        if (onLogged) onLogged();
      } catch (err) {
        console.error('Failed to log WhatsApp activity:', err);
      } finally {
        setIsLogging(false);
      }
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <MessageSquare className="w-5 h-5" />
          <span>Connect via WhatsApp</span>
        </div>
      }
      subtitle={`Recipient: ${inquiry.student_name} (${inquiry.mobile}) • ${inquiry.course_name}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Template Selectors */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Select Message Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'welcome', label: 'Welcome & Intro' },
              { id: 'followup', label: 'Follow-up Check' },
              { id: 'demo', label: 'Demo Invitation' },
              { id: 'custom', label: 'Custom Message' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                  selectedTemplate === t.id
                    ? 'bg-[#7138F5] text-white border-[#7138F5] shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Message Preview (Editable)
          </label>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSelectedTemplate('custom');
            }}
            className="w-full text-xs font-sans text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            placeholder="Type your WhatsApp message..."
          />
        </div>

        {/* Notice & Activity Checkbox */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Clicking the button opens WhatsApp Web or the WhatsApp desktop application with your pre-filled text. Please send the message inside WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="logWhatsAppActivity"
            checked={logActivity}
            onChange={(e) => setLogActivity(e.target.checked)}
            className="w-4 h-4 text-[#7138F5] rounded border-slate-300 focus:ring-[#7138F5]"
          />
          <label htmlFor="logWhatsAppActivity" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Automatically log this WhatsApp conversation in the inquiry activity timeline
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={isLogging}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all transform active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Open WhatsApp Chat</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
