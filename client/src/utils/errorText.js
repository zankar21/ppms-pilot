export function errorText(err){
  return err?.userMessage || err?.message || (typeof err==='string' ? err : 'Something went wrong');
}
