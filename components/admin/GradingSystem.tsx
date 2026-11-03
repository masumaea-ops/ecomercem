
import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Plus, Save, Trash2, Edit2, Loader2, Search, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { Student, GradeScale, Assessment } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GradingSystem: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'students' | 'assessments' | 'scales'>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [scales, setScales] = useState<GradeScale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [sRes, gRes] = await Promise.all([
                apiClient.get('/academy/students'),
                apiClient.get('/academy/scales')
            ]);
            setStudents(sRes.data);
            setScales(gRes.data);
        } catch (error) {
            console.error("Failed to load academy data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getGradeForScore = (score: number) => {
        const scale = scales.find(s => score >= s.minScore && score <= s.maxScore);
        return scale ? scale.label : 'N/A';
    };

    const filteredStudents = students.filter(s => 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col font-sans">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase flex items-center gap-3">
                        <GraduationCap className="text-masuma-orange" size={32} />
                        Technical Academy
                    </h2>
                    <p className="text-sm text-gray-500">Manage mechanic certification, training performance and grading.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-masuma-dark text-white px-4 py-2 rounded font-bold uppercase text-xs hover:bg-masuma-orange transition flex items-center gap-2"
                    >
                        <Plus size={16} /> Enroll Trainee
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button 
                        onClick={() => setActiveTab('students')}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'students' ? 'border-masuma-orange text-masuma-orange bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                    >
                        Trainees
                    </button>
                    <button 
                        onClick={() => setActiveTab('assessments')}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'assessments' ? 'border-masuma-orange text-masuma-orange bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                    >
                        Assessment Ledger
                    </button>
                    <button 
                        onClick={() => setActiveTab('scales')}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'scales' ? 'border-masuma-orange text-masuma-orange bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                    >
                        Grading Schemes
                    </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'students' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search by Name or Reg No..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                                    <span className="flex items-center gap-1"><Users size={14}/> {students.length} Enrolled</span>
                                </div>
                            </div>

                            <div className="overflow-hidden border border-gray-100 rounded">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b">
                                        <tr>
                                            <th className="px-6 py-4">Trainee</th>
                                            <th className="px-6 py-4">Reg No</th>
                                            <th className="px-6 py-4">Avg. Score</th>
                                            <th className="px-6 py-4">Current Grade</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-gray-50 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-masuma-dark text-white flex items-center justify-center font-bold text-xs">
                                                            {student.fullName.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-masuma-dark text-sm">{student.fullName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{student.studentId}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-masuma-orange" 
                                                                style={{ width: `${student.currentAverage || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold">{student.currentAverage || 0}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-masuma-orange">{getGradeForScore(student.currentAverage || 0)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${student.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-1 text-gray-400 hover:text-masuma-orange"><Edit2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'scales' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-masuma-dark uppercase text-sm border-b pb-2">Active Grading Scale</h3>
                                <div className="space-y-2">
                                    {scales.map(scale => (
                                        <div key={scale.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded">
                                            <div>
                                                <span className="text-lg font-bold text-masuma-dark">{scale.label}</span>
                                                <p className="text-xs text-gray-500">{scale.minScore}% - {scale.maxScore}%</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{scale.comment}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-masuma-dark p-6 rounded-lg text-white">
                                <h3 className="font-bold uppercase text-sm mb-4 flex items-center gap-2">
                                    <BookOpen size={18} className="text-masuma-orange" />
                                    About Certification
                                </h3>
                                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                    Masuma Autoparts EA operates a professional mechanic accreditation program. Trainees must maintain a minimum 70% average (Credit) to be eligible for regional workshop placement.
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs">
                                        <CheckCircle size={14} className="text-masuma-orange" />
                                        <span>Practical Bench Competency (40%)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <CheckCircle size={14} className="text-masuma-orange" />
                                        <span>Diagnostic Theory (30%)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <CheckCircle size={14} className="text-masuma-orange" />
                                        <span>Customer Service & Safety (30%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GradingSystem;
