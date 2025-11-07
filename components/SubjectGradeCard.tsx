import React, { useMemo, useState } from 'react';
import type { SubjectGrade } from '../types';
import BottomSheet from './BottomSheet';
import AnalyticsSheetContent from './AnalyticsSheetContent';
import { getGradeAnalysis } from '../services/geminiService';

const getSubjectIcon = (subject: string): string => {
    const lowerCaseSubject = subject.toLowerCase();
    if (lowerCaseSubject.includes('физическая культура') || lowerCaseSubject.includes('физкультура')) return '🏃‍♀️';
    if (lowerCaseSubject.includes('анатомия')) return '💀';
    if (lowerCaseSubject.includes('философия')) return '🧠';
    if (lowerCaseSubject.includes('физиология')) return '🫀';
    if (lowerCaseSubject.includes('иммунология')) return '🦠';
    if (lowerCaseSubject.includes('биохимия')) return '🧪';
    if (lowerCaseSubject.includes('гистология')) return '🔬';
    if (lowerCaseSubject.includes('безопасность жизнедеятельности')) return '⛑️';
    if (lowerCaseSubject.includes('сестринское дело')) return '🩹';
    if (lowerCaseSubject.includes('коммуникативный тренинг')) return '🗣️';
    if (lowerCaseSubject.includes('биоэтика')) return '❤️‍🩹';
    return '📚'; // Иконка по умолчанию
};

const getAvgGradeColor = (score: number | null): string => {
    if (score === null) return 'text-gray-500 dark:text-gray-400';
    if (score >= 86) return 'text-green-500 dark:text-green-400';
    if (score >= 71) return 'text-yellow-500 dark:text-yellow-400';
    if (score >= 56) return 'text-orange-500 dark:text-orange-400';
    return 'text-red-500 dark:text-red-400';
};

const getScorePillColor = (score: SubjectGrade['score']): string => {
    if (score === 'н') return 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300';
    if (score === 'б') return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
    if (score === 'зачет') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    if (typeof score === 'number') {
        if (score >= 86) return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
        if (score >= 71) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
        if (score >= 56) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    }
    return 'bg-highlight text-text-primary dark:bg-dark-highlight dark:text-dark-text-primary';
};

const formatScore = (score: SubjectGrade['score']): string => {
    if (score === 'н') return 'Н';
    if (score === 'б') return 'Б';
    if (score === 'зачет') return 'З';
    if (score === null) return '';
    return score.toString();
};

const getPluralForm = (number: number, one: string, two: string, five: string): string => {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
};


interface GradeListItemProps {
  grade: SubjectGrade;
}

const GradeListItem: React.FC<GradeListItemProps> = ({ grade }) => (
    <li className="flex justify-between items-center bg-secondary dark:bg-dark-secondary px-3 py-2 rounded-xl border border-border-color dark:border-dark-border-color">
        <div className="min-w-0 pr-2">
            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{grade.topic}</p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                {new Date(grade.date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
        </div>
        {grade.score !== null && (
          <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${getScorePillColor(grade.score)}`}>
              {formatScore(grade.score)}
          </div>
        )}
    </li>
);

interface SubjectGradeCardProps {
  subject: string;
  grades: SubjectGrade[];
  cachedAnalysis: { data: string; timestamp: number } | undefined;
  onAnalysisFetched: (recommendation: string) => void;
}

const SubjectGradeCard: React.FC<SubjectGradeCardProps> = ({ subject, grades, cachedAnalysis, onAnalysisFetched }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyticsOpen, setAnalyticsOpen] = useState(false);
  const [isAbsencesOpen, setAbsencesOpen] = useState(false);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);
  
  const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

  const { absences, avgScore } = useMemo(() => {
    const subjectAbsences = grades.filter(g => g.score === 'н');
    const avgScoreFromSheet = grades.find(g => g.avg_score !== undefined)?.avg_score;
    const finalAvgScore: number | null = avgScoreFromSheet !== undefined ? avgScoreFromSheet : null;
    
    return {
        absences: subjectAbsences,
        avgScore: finalAvgScore,
    };
  }, [grades]);
  
  const handleOpenAnalytics = async () => {
    setAnalyticsOpen(true);
    const isCacheValid = cachedAnalysis && (Date.now() - cachedAnalysis.timestamp < CACHE_DURATION);
    
    // Fetch only if cache is invalid and not currently fetching.
    if (!isCacheValid && !isFetchingAnalytics) {
        setIsFetchingAnalytics(true);
        try {
            const rec = await getGradeAnalysis(subject, grades);
            onAnalysisFetched(rec);
        } catch (e) {
            console.error(e);
            onAnalysisFetched("Не удалось загрузить рекомендации из-за ошибки.");
        } finally {
            setIsFetchingAnalytics(false);
        }
    }
  };


  const displayedGrades = isExpanded ? grades : grades.slice(0, 1);

  return (
    <>
    <div className="bg-secondary dark:bg-dark-secondary rounded-2xl shadow-soft dark:shadow-dark-soft border border-border-color dark:border-dark-border-color transition-all duration-300 ease-in-out p-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl" role="img" aria-hidden="true">{getSubjectIcon(subject)}</span>
          <h3 className="font-bold text-text-primary dark:text-dark-text-primary break-words flex-1">{subject}</h3>
        </div>
        {avgScore !== null && (
          <div className={`text-2xl font-bold whitespace-nowrap pl-2 ${getAvgGradeColor(avgScore)}`}>
            {avgScore.toFixed(2)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={() => setAbsencesOpen(true)}
          className="w-full text-sm font-semibold bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 py-2 px-3 rounded-xl hover:bg-red-200/70 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center"
          aria-label={`Показать отработки по предмету ${subject}, количество: ${absences.length}`}
          disabled={absences.length === 0}
        >
          <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
          <span>{absences.length} {getPluralForm(absences.length, 'отработка', 'отработки', 'отработок')}</span>
        </button>
        <button
          onClick={handleOpenAnalytics}
          className="w-full text-sm font-semibold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 py-2 px-3 rounded-xl hover:bg-blue-200/70 dark:hover:bg-blue-500/20 transition-colors flex items-center justify-center"
          aria-label={`Показать аналитику по предмету ${subject}`}
        >
          <i className="ph-bold ph-chart-bar mr-2 text-base"></i>
          <span>Аналитика</span>
        </button>
      </div>
      
      {grades.length > 0 && (
          <ul className="space-y-2 mt-4">
            {displayedGrades.map((grade, index) => (
                <GradeListItem key={`${grade.date}-${grade.topic}-${index}`} grade={grade} />
            ))}
          </ul>
      )}

      {grades.length > 1 && (
        <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="w-full text-center text-sm font-bold text-accent dark:text-dark-accent mt-4 pt-2 hover:opacity-80 transition-opacity"
        >
            {isExpanded ? 'Скрыть' : `Показать все (${grades.length})`}
            <i className={`ph-bold ph-caret-${isExpanded ? 'up' : 'down'} ml-1 align-middle`}></i>
        </button>
      )}

    </div>

    <BottomSheet isOpen={isAnalyticsOpen} onClose={() => setAnalyticsOpen(false)} title={`Аналитика по предмету ${subject.toLowerCase()}`}>
        <AnalyticsSheetContent 
            subject={subject} 
            grades={grades} 
            isGenerating={isFetchingAnalytics || !cachedAnalysis}
            recommendation={cachedAnalysis?.data}
        />
    </BottomSheet>

    <BottomSheet isOpen={isAbsencesOpen} onClose={() => setAbsencesOpen(false)} title={`Отработки: ${subject}`}>
        {absences.length > 0 ? (
            <ul className="space-y-2">
                {[...absences].reverse().map((absence, index) => (
                    <li key={index} className="flex justify-between items-center bg-secondary dark:bg-dark-secondary px-3 py-2 rounded-xl border border-border-color dark:border-dark-border-color">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{absence.topic}</p>
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                                {new Date(absence.date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
             <p className="text-center text-text-secondary dark:text-dark-text-secondary py-8">Пропусков по этому предмету нет.</p>
        )}
    </BottomSheet>
    </>
  );
};

export default SubjectGradeCard;