/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { Dashboard } from './components/Dashboard';
import { Chatbot } from './components/Chatbot';
import { Finding, DashboardData, extractFindingsFromFiles, generateDashboardData } from './lib/gemini';
import { FileSearch, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setFiles([]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // 1. Extract data from files
      const extractedFindings = await extractFindingsFromFiles(files);
      
      // If we already have findings, we might want to append or replace. Let's replace for now.
      setFindings(extractedFindings);
      
      // 2. Generate dashboard data if there are findings
      if (extractedFindings.length > 0) {
        const dashboard = await generateDashboardData(extractedFindings);
        setDashboardData(dashboard);
      } else {
        setDashboardData(null);
      }
      
      // Close modal on success
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while processing the files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileSearch className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard Audit 5R</h1>
          </div>
          
          <button
            onClick={openModal}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{findings.length > 0 ? 'Upload More' : 'Upload Documents'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dashboard Section */}
        <section className="relative">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Insights</h2>
          <Dashboard data={dashboardData} />
        </section>

        {/* Data Table Section */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4">Extracted Data</h2>
          <DataTable findings={findings} />
        </section>
      </main>

      {/* Chatbot Widget */}
      <Chatbot findings={findings} />

      {/* Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Upload Documents</h2>
                  <p className="text-slate-500 text-xs mt-1">Upload PowerPoint or PDF files containing audit findings.</p>
                </div>
                <button 
                  onClick={() => !isProcessing && setIsModalOpen(false)}
                  disabled={isProcessing}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <FileUpload files={files} onFilesChange={setFiles} />
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcess}
                  disabled={files.length === 0 || isProcessing}
                  className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Extract & Analyze</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
