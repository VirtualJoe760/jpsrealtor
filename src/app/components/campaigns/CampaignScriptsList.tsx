'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Volume2,
} from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import VoicemailScriptViewer from './VoicemailScriptViewer';

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface VoicemailScript {
  _id: string;
  script: string;
  scriptVersion: number;
  generatedBy: 'ai' | 'manual';
  aiModel?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  audio: {
    status: 'pending' | 'generating' | 'completed' | 'failed';
    url?: string;
    voiceId?: string;
    duration?: number;
    generatedAt?: string;
    error?: string;
  };
  contactId: string;
  campaignId: string;
}

interface ScriptWithContact extends VoicemailScript {
  contact?: Contact;
}

interface CampaignScriptsListProps {
  campaignId: string;
}

export default function CampaignScriptsList({
  campaignId,
}: CampaignScriptsListProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [scripts, setScripts] = useState<ScriptWithContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openScriptId, setOpenScriptId] = useState<string | null>(null);

  // Fetch scripts for campaign
  const fetchScripts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/scripts`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch scripts');
      }

      setScripts(data.scripts || []);
    } catch (error: any) {
      console.error('Error fetching scripts:', error);
      setError(error.message || 'Failed to load scripts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, [campaignId]);

  // Toggle script viewer
  const handleToggleScript = (scriptId: string) => {
    setOpenScriptId(openScriptId === scriptId ? null : scriptId);
  };

  // Get audio status icon
  const getAudioStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${
          isLight ? 'text-indigo-600' : 'text-indigo-400'
        }`} />
        <span className={`ml-3 ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>Loading scripts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg p-4 ${
        isLight ? 'bg-red-50' : 'bg-red-900/20'
      }`}>
        <p className={`${
          isLight ? 'text-red-700' : 'text-red-400'
        }`}>{error}</p>
        <button
          onClick={fetchScripts}
          className={`mt-2 text-sm underline ${
            isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'
          }`}
        >
          Try again
        </button>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className={`rounded-lg p-8 text-center ${
        isLight ? 'bg-gray-50' : 'bg-gray-800'
      }`}>
        <FileText className={`w-12 h-12 mx-auto mb-3 ${
          isLight ? 'text-gray-400' : 'text-gray-600'
        }`} />
        <p className={`${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>No scripts generated yet</p>
        <p className={`text-sm mt-1 ${
          isLight ? 'text-gray-500' : 'text-gray-500'
        }`}>
          Scripts will appear here after generation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`rounded-lg p-4 border ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-sm ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>Total Scripts</p>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>{scripts.length}</p>
        </div>
        <div className={`rounded-lg p-4 border ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-sm ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>With Audio</p>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-green-600' : 'text-green-400'
          }`}>
            {scripts.filter((s) => s.audio.status === 'completed').length}
          </p>
        </div>
        <div className={`rounded-lg p-4 border ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-sm ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>Approved</p>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-blue-600' : 'text-blue-400'
          }`}>
            {scripts.filter((s) => s.reviewStatus === 'approved').length}
          </p>
        </div>
        <div className={`rounded-lg p-4 border ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <p className={`text-sm ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>Pending</p>
          <p className={`text-2xl font-bold ${
            isLight ? 'text-yellow-600' : 'text-yellow-400'
          }`}>
            {scripts.filter((s) => s.reviewStatus === 'pending').length}
          </p>
        </div>
      </div>

      {/* Scripts List */}
      <div className="space-y-3">
        {scripts.map((script) => (
          <div key={script._id} className={`rounded-lg border ${
            isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
          }`}>
            {/* Script Header */}
            <div
              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50'
              }`}
              onClick={() => handleToggleScript(script._id)}
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Contact Info */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isLight ? 'bg-gray-100' : 'bg-gray-700'
                  }`}>
                    <User className={`w-5 h-5 ${
                      isLight ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      {script.contact?.firstName} {script.contact?.lastName}
                    </p>
                    {script.contact?.phone && (
                      <p className={`text-sm ${
                        isLight ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {script.contact.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Script Info */}
                <div className="flex items-center gap-4 ml-auto">
                  {/* Audio Status */}
                  <div className="flex items-center gap-2">
                    {getAudioStatusIcon(script.audio.status)}
                    <span className={`text-sm capitalize ${
                      isLight ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {script.audio.status === 'completed' ? (
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          Audio Ready
                        </span>
                      ) : (
                        script.audio.status
                      )}
                    </span>
                  </div>

                  {/* Review Status Badge */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      script.reviewStatus === 'approved'
                        ? isLight
                          ? 'bg-green-100 text-green-700'
                          : 'bg-green-900/30 text-green-400'
                        : script.reviewStatus === 'rejected'
                        ? isLight
                          ? 'bg-red-100 text-red-700'
                          : 'bg-red-900/30 text-red-400'
                        : isLight
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}
                  >
                    {script.reviewStatus}
                  </div>

                  {/* Script Version */}
                  <div className={`text-sm ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    v{script.scriptVersion}
                  </div>

                  {/* Expand Icon */}
                  {openScriptId === script._id ? (
                    <ChevronUp className={`w-5 h-5 ${
                      isLight ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 ${
                      isLight ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  )}
                </div>
              </div>
            </div>

            {/* Script Viewer (Expandable) */}
            <AnimatePresence>
              {openScriptId === script._id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`overflow-hidden border-t ${
                    isLight ? 'border-gray-200' : 'border-gray-700'
                  }`}
                >
                  <div className="p-4">
                    <VoicemailScriptViewer
                      script={script}
                      onUpdate={fetchScripts}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
