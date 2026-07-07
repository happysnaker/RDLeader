export async function getEmployees() {
  const response = await fetch('http://localhost:3001/employees');
  if (!response.ok) throw new Error('Failed to load employees');
  return response.json();
}

export async function getEmployeeDetail(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}`);
  if (!response.ok) throw new Error('Failed to load employee detail');
  return response.json();
}

export async function createCandidate(input: { name: string; interviewNotes: string }) {
  const response = await fetch('http://localhost:3001/hr/candidates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to create candidate');
  return response.json();
}

export async function updateEmployeeLevel(employeeId: string, level: '1-2' | '2-1' | '2-2') {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/level`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level }),
  });
  if (!response.ok) throw new Error('Failed to update employee level');
  return response.json();
}

export async function updateEmploymentStatus(employeeId: string, employmentStatus: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/employment-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employmentStatus }),
  });
  if (!response.ok) throw new Error('Failed to update employment status');
  return response.json();
}

export async function getInternalMessages(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/internal-messages`);
  if (!response.ok) throw new Error('Failed to load internal messages');
  return response.json();
}

export async function sendInternalMessage(input: {
  senderEmployeeId: string;
  recipientEmployeeId: string;
  body: string;
}) {
  const response = await fetch('http://localhost:3001/chat/internal-message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to send internal message');
  return response.json();
}
