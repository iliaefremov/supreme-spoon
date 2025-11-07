import React, { useState, useEffect, useCallback } from 'react';
import Schedule from './components/Schedule';
import Grades from './components/Grades';
import { ScheduleIcon, GradesIcon } from './components/icons/Icons';
import { GRADES_DATA, SCHEDULE_WEEK_1, SCHEDULE_WEEK_2, ALLOWED_TELEGRAM_USER_IDS } from './constants';
import type { TelegramUser, SubjectGrade, DaySchedule, Homework } from './types';
import { getGrades, getHomeworks, getLectureAbsences } from './services/googleSheetsService';

type Tab = 'schedule' | 'grades';

interface UnauthorizedScreenProps {
  userId?: number;
}

const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ userId }) => (
    <div className="flex flex-col items-center justify-center h-screen text-center bg-primary dark:bg-dark-primary p-6 animate-fade-in">
        <div className="text-5xl mb-4" role="img" aria-label="Lock Icon">🔐</div>
        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-2">Доступ ограничен</h2>
        {userId ? (
            <>
                <p className="text-text-secondary dark:text-dark-text-secondary max-w-sm mb-4">
                    К сожалению, ваш аккаунт не имеет доступа к этому приложению.
                </p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    Ваш Telegram ID: <code className="bg-highlight dark:bg-dark-highlight px-1.5 py-1 rounded-md font-mono">{userId}</code>
                </p>
            </>
        ) : (
            <p className="text-text-secondary dark:text-dark-text-secondary max-w-sm">
                Пожалуйста, откройте это приложение внутри Telegram, чтобы мы могли вас идентифицировать.
            </p>
        )}
    </div>
);


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unauthorizedId, setUnauthorizedId] = useState<number | null>(null);

  // Centralized data state
  const [grades, setGrades] = useState<SubjectGrade[]>([]);
  const [lectureAbsences, setLectureAbsences] = useState<SubjectGrade[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    // --- User Authentication and Initialization ---
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand?.(); 
    }

    const currentUser = tg?.initDataUnsafe?.user;

    if (currentUser) {
        if (ALLOWED_TELEGRAM_USER_IDS.includes(currentUser.id.toString())) {
            setUser(currentUser);
        } else {
            setUnauthorizedId(currentUser.id);
        }
    }
    
    setIsLoading(false);
  }, []);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [activeTab]);
  
  // --- Centralized Data Fetching ---
  const loadAllData = useCallback(async () => {
    setIsDataLoading(true);
    setDataError(null);
    try {
        const [fetchedGrades, fetchedLectureAbsences, fetchedHomeworks] = await Promise.all([
            getGrades(),
            getLectureAbsences(),
            getHomeworks(),
        ]);
        setGrades(fetchedGrades);
        setLectureAbsences(fetchedLectureAbsences);
        setHomeworks(fetchedHomeworks);
    } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setDataError('Не удалось загрузить данные. Показаны демонстрационные материалы.');
        setGrades(GRADES_DATA); // Fallback to demo data
        setLectureAbsences([]);
        setHomeworks([]);
    } finally {
        setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load data only after user is identified and authorized
    if (user) {
        loadAllData();
    }
  }, [user, loadAllData]);


  const renderContent = () => {
    if (!user) return null; // Should not happen if logic is correct, but as a safeguard.
    
    const userGrades = grades.filter(grade => grade.user_id === user.id.toString());
    const userLectureAbsences = lectureAbsences.filter(absence => absence.user_id === user.id.toString());

    switch (activeTab) {
      case 'schedule':
        return <Schedule 
            user={user} 
            homeworks={homeworks}
            isLoadingHomework={isDataLoading}
          />;
      case 'grades':
        return <Grades 
            user={user} 
            allGrades={grades}
            userGrades={userGrades}
            userLectureAbsences={userLectureAbsences}
            isLoading={isDataLoading}
            error={dataError}
          />;
      default:
        return <Schedule 
            user={user} 
            homeworks={homeworks}
            isLoadingHomework={isDataLoading}
          />;
    }
  };
  
  const NavItem = ({ tab, icon, label }: { tab: Tab, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex flex-col items-center justify-center py-2 text-xs transition-colors duration-300 ${activeTab === tab ? 'text-accent dark:text-dark-accent font-bold' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'}`}
    >
      <div className="relative flex items-center justify-center">
        {icon}
      </div>
      <span className="mt-1">{label}</span>
    </button>
  );

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-primary dark:bg-dark-primary text-text-primary dark:text-dark-text-primary">
            Загрузка...
        </div>
    );
  }

  if (unauthorizedId) {
     return <UnauthorizedScreen userId={unauthorizedId} />;
  }

  if (!user) {
     return <UnauthorizedScreen />;
  }

  return (
    <>
      <div className="bg-primary dark:bg-dark-primary text-text-primary dark:text-dark-text-primary min-h-screen font-sans pb-24">
        <main className="container mx-auto px-4 pt-6">
          {renderContent()}
        </main>
        
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3 sm:pb-4 pointer-events-none">
            <nav className="pointer-events-auto max-w-md mx-auto h-16 bg-white/40 dark:bg-slate-900/50 backdrop-blur-3xl border border-white/30 dark:border-white/10 rounded-[2.5rem] shadow-soft-lg dark:shadow-dark-soft-lg">
               <div className="flex items-stretch h-full">
                  <NavItem tab="schedule" icon={<ScheduleIcon className="text-2xl" isActive={activeTab === 'schedule'} />} label="Расписание" />
                  <NavItem tab="grades" icon={<GradesIcon className="text-2xl" isActive={activeTab === 'grades'} />} label="Успеваемость" />
               </div>
            </nav>
        </div>

      </div>
    </>
  );
};

export default App;