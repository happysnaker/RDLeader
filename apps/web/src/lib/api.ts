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
