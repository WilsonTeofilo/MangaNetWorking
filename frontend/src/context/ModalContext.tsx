import { createContext, useContext, useState, ReactNode } from 'react';
import { Creator, Work, Chapter } from '../types';

interface DonateModalData {
  isOpen: boolean;
  creatorId: string;
  creatorName: string;
  workTitle?: string;
  workId?: string;
}

interface MembershipModalData {
  isOpen: boolean;
  creator: Creator | null;
}

interface EarlyAccessModalData {
  isOpen: boolean;
  chapter: Chapter | null;
  creator: Creator | null;
  work: Work | null;
}

interface PayoutModalData {
  isOpen: boolean;
  creator: Creator | null;
}

interface VipModalData {
  isOpen: boolean;
}

interface ReportModalData {
  isOpen: boolean;
  workId: string;
  workTitle: string;
  chapterId?: string;
}

interface ModalContextType {
  donateData: DonateModalData;
  membershipData: MembershipModalData;
  earlyAccessData: EarlyAccessModalData;
  payoutData: PayoutModalData;
  vipData: VipModalData;
  reportData: ReportModalData;
  openDonate: (creatorId: string, creatorName: string, workTitle?: string, workId?: string) => void;
  closeDonate: () => void;
  openMembership: (creator: Creator) => void;
  closeMembership: () => void;
  openEarlyAccess: (chapter: Chapter, creator: Creator, work: Work) => void;
  closeEarlyAccess: () => void;
  openPayout: (creator: Creator) => void;
  closePayout: () => void;
  openVip: () => void;
  closeVip: () => void;
  openReport: (workId: string, workTitle: string, chapterId?: string) => void;
  closeReport: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [donateData, setDonateData] = useState<DonateModalData>({
    isOpen: false,
    creatorId: '',
    creatorName: '',
  });

  const [membershipData, setMembershipData] = useState<MembershipModalData>({
    isOpen: false,
    creator: null,
  });

  const [earlyAccessData, setEarlyAccessData] = useState<EarlyAccessModalData>({
    isOpen: false,
    chapter: null,
    creator: null,
    work: null,
  });

  const [payoutData, setPayoutData] = useState<PayoutModalData>({
    isOpen: false,
    creator: null,
  });

  const [vipData, setVipData] = useState<VipModalData>({
    isOpen: false,
  });

  const [reportData, setReportData] = useState<ReportModalData>({
    isOpen: false,
    workId: '',
    workTitle: '',
  });

  const openDonate = (creatorId: string, creatorName: string, workTitle?: string, workId?: string) => {
    setDonateData({ isOpen: true, creatorId, creatorName, workTitle, workId });
  };
  const closeDonate = () => setDonateData(prev => ({ ...prev, isOpen: false }));

  const openMembership = (creator: Creator) => {
    setMembershipData({ isOpen: true, creator });
  };
  const closeMembership = () => setMembershipData(prev => ({ ...prev, isOpen: false }));

  const openEarlyAccess = (chapter: Chapter, creator: Creator, work: Work) => {
    setEarlyAccessData({ isOpen: true, chapter, creator, work });
  };
  const closeEarlyAccess = () => setEarlyAccessData(prev => ({ ...prev, isOpen: false }));

  const openPayout = (creator: Creator) => {
    setPayoutData({ isOpen: true, creator });
  };
  const closePayout = () => setPayoutData(prev => ({ ...prev, isOpen: false }));

  const openVip = () => setVipData({ isOpen: true });
  const closeVip = () => setVipData({ isOpen: false });

  const openReport = (workId: string, workTitle: string, chapterId?: string) => {
    setReportData({ isOpen: true, workId, workTitle, chapterId });
  };
  const closeReport = () => setReportData(prev => ({ ...prev, isOpen: false }));

  return (
    <ModalContext.Provider
      value={{
        donateData,
        membershipData,
        earlyAccessData,
        payoutData,
        vipData,
        reportData,
        openDonate,
        closeDonate,
        openMembership,
        closeMembership,
        openEarlyAccess,
        closeEarlyAccess,
        openPayout,
        closePayout,
        openVip,
        closeVip,
        openReport,
        closeReport,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModals(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}
