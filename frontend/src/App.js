import React, { useEffect, useState } from 'react';
import { Layout, Table, Button, Card, Row, Col, Typography, Tag, Modal, Input, Upload, message, Progress, Space, Alert, Select, Divider } from 'antd';
import { RobotOutlined, UploadOutlined, FilePdfOutlined, EditOutlined, DashboardOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
// ... 기존 import 유지

const App = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedRound, setSelectedRound] = useState("최초");
  
  // 모달 제어용 추가 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [description, setDescription] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/isms-items?year=${selectedYear}&round_name=${selectedRound}`);
      const sRes = await axios.get('http://localhost:8000/api/statistics');
      setItems(res.data);
      setStats(sRes.data);
    } catch (err) { message.error("로딩 실패"); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedYear, selectedRound]);

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    // AI 분석 결과가 있으면 파일명 자동 세팅
    const initialEvidence = analysis?.filename || (item.evidence_name !== '-' ? item.evidence_name : '');
    setEvidenceName(initialEvidence);
    
    // 운영현황이 비어있으면 AI 초안 생성
    if (!item.description || item.description === '-') {
      setDescription(`[${selectedYear}년 ${selectedRound} AI 생성 초안]\n본 조직은 ${item.item_name} 기준에 부합하도록 내부 지침을 수립하고 있으며, 관련 증적(${initialEvidence || '첨부파일'})을 통해 정기적으로 이행 상태를 점검하고 있습니다.`);
    } else {
      setDescription(item.description);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      await axios.post('http://localhost:8000/api/save-item', {
        id: selectedItem.id,
        year: selectedYear,
        round_name: selectedRound,
        description,
        evidence_name: evidenceName
      });
      message.success("저장되었습니다.");
      setIsModalOpen(false);
      loadData();
    } catch (err) { message.error("저장 실패"); }
  };

  const columns = [
    { title: '번호', dataIndex: 'id', key: 'id', width: 80, align: 'center' },
    { title: '항목명', dataIndex: 'item_name', key: 'item_name', width: 250 },
    { title: '운영 현황', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '증적자료', dataIndex: 'evidence_name', key: 'evidence_name', width: 150, render: (t) => t !== '-' ? <Tag color="blue">{t}</Tag> : '-' },
    { title: '상태', dataIndex: 'status', key: 'status', width: 100, align: 'center', render: (s) => <Tag color={s === '작성완료' ? 'green' : 'orange'}>{s}</Tag> },
    { title: '작성', key: 'action', width: 80, align: 'center', render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(r)} /> }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* 기존 Header 및 Content 구조 유지 */}
      <Header style={{ background: '#001529', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>🛡️ ISMS-P 통합 관리 시스템</Title>
        <Space>
          <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 100 }}>
            {["2024", "2025", "2026"].map(y => <Option key={y} value={y}>{y}년</Option>)}
          </Select>
          <Select value={selectedRound} onChange={setSelectedRound} style={{ width: 120 }}>
            {["최초", "사후 1차", "사후 2차", "갱신심사"].map(r => <Option key={r} value={r}>{r}</Option>)}
          </Select>
          <Button type="primary" danger icon={<FilePdfOutlined />}>PDF 출력</Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px' }}>
        {/* 추이 대시보드 카드 */}
        <Card title={<Space><HistoryOutlined /> 연도별/심사별 이행률 추이</Space>} style={{ marginBottom: 20 }}>
          <Row gutter={16}>
            {stats.map(s => (
              <Col key={s.label} span={4} style={{ textAlign: 'center' }}>
                <Progress type="circle" percent={s.percent} size={80} />
                <div style={{ marginTop: 8 }}><Text strong>{s.label}</Text></div>
              </Col>
            ))}
          </Row>
        </Card>

        <Table dataSource={items} columns={columns} loading={loading} rowKey="id" bordered />

        {/* 상세 작성 모달 */}
        <Modal title={`[${selectedItem?.id}] 상세 작성`} open={isModalOpen} onOk={handleSave} onCancel={() => setIsModalOpen(false)} width={700}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>인증 기준:</Text>
            <div style={{ background: '#f5f5f5', padding: 10 }}>{selectedItem?.content}</div>
            <Text strong>증적 자료명:</Text>
            <Input value={evidenceName} onChange={e => setEvidenceName(e.target.value)} />
            <Text strong>운영 현황 (AI 초안 포함):</Text>
            <TextArea rows={6} value={description} onChange={e => setDescription(e.target.value)} />
          </Space>
        </Modal>
      </Content>
    </Layout>
  );
};

export default App;