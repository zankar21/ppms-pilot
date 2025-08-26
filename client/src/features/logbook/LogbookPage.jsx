import React, { useState } from 'react';
import AskPPMS from '../../components/AskPPMS';
import LogbookTable from './LogbookTable';

export default function LogbookPage() {
  const [unit, setUnit] = useState('');
  const [department, setDepartment] = useState('');

  return (
    <div className="p-4">
      <AskPPMS unit={unit} department={department} placeholder="Search past logbook incidents…" />
      <LogbookTable initialUnit={unit} initialDepartment={department} />
    </div>
  );
}
