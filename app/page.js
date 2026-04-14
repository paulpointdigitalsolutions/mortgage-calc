'use client';
import { useState, useCallback } from 'react';

const SAVINGS_RATE = 0.07;

function formatCurrency(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function formatMonths(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toMonthYear(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function calcMortgage(balance, monthlyRate, payment) {
  let bal = balance;
  let totalInterest = 0;
  let months = 0;
  while (bal > 0.01 && months < 1200) {
    const interest = bal * monthlyRate;
    totalInterest += interest;
    bal = bal + interest - payment;
    if (bal < 0) bal = 0;
    months++;
  }
  return { months, totalInterest };
}

function calcSavingsGrowth(monthlyAmount, months) {
  const r = SAVINGS_RATE / 12;
  let total = 0;
  for (let i = 0; i < months; i++) {
    total = (total + monthlyAmount) * (1 + r);
  }
  return total;
}

export default function Home() {
  const [inputs, setInputs] = useState({
    balance: '',
    payment: '',
    endDate: '',
    rate: '',
    overpayment: '',
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setInputs(p => ({ ...p, [k]: v }));

  const calculate = useCallback(() => {
    setError('');
    const balance = parseFloat(inputs.balance);
    const payment = parseFloat(inputs.payment);
    const rate = parseFloat(inputs.rate);
    const overpayment = parseFloat(inputs.overpayment) || 0;
    const endDate = new Date(inputs.endDate);
    const today = new Date();

    if (!balance || !payment || !rate || !inputs.endDate) {
      setError('Please fill in all required fields.');
      return;
    }
    if (endDate <= today) {
      setError('End date must be in the future.');
      return;
    }

    const monthlyRate = rate / 100 / 12;

    // Original mortgage
    const orig = calcMortgage(balance, monthlyRate, payment);
    const origEndDate = addMonths(today, orig.months);

    // With overpayment
    const over = calcMortgage(balance, monthlyRate, payment + overpayment);
    const overEndDate = addMonths(today, over.months);

    const monthsSaved = orig.months - over.months;
    const interestSaved = orig.totalInterest - over.totalInterest;

    // Remaining months after overpayment ends, up to original end date
    const remainingMonths = orig.months - over.months;

    // Scenario A: After mortgage paid off early, save (payment + overpayment) for remaining months
    const scenarioA = calcSavingsGrowth(payment + overpayment, remainingMonths);

    // Scenario B: Just put the overpayment into savings from day 1, for full original term
    const scenarioB = calcSavingsGrowth(overpayment, orig.months);

    setResults({
      orig,
      origEndDate,
      over,
      overEndDate,
      monthsSaved,
      interestSaved,
      scenarioA,
      scenarioB,
      origMonths: orig.months,
      payment,
      overpayment,
    });
  }, [inputs]);

  const winner = results
    ? results.scenarioA > results.scenarioB ? 'A' : 'B'
    : null;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Mortgage Overpayment Calculator
        </div>
        <h1 style={{ fontFamily: 'DM Serif Display', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.1, marginBottom: '0.75rem' }}>
          Should you overpay<br />your mortgage?
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, lineHeight: 1.7, fontSize: '0.95rem' }}>
          Enter your mortgage details below to see how overpaying compares to investing that money instead.
        </p>
      </div>

      {/* Input card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div>
            <label style={labelStyle}>Outstanding balance (£)</label>
            <input type="number" placeholder="e.g. 180000" value={inputs.balance} onChange={e => set('balance', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Monthly payment (£)</label>
            <input type="number" placeholder="e.g. 950" value={inputs.payment} onChange={e => set('payment', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Interest rate (%)</label>
            <input type="number" placeholder="e.g. 4.5" step="0.01" value={inputs.rate} onChange={e => set('rate', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Current end date</label>
            <input type="date" value={inputs.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Monthly overpayment (£)</label>
            <input type="number" placeholder="e.g. 200 — how much extra you're considering" value={inputs.overpayment} onChange={e => set('overpayment', e.target.value)} />
          </div>

        </div>

        {error && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>}

        <button
          onClick={calculate}
          style={{
            marginTop: '1.5rem',
            background: 'var(--accent)',
            color: '#0a0f1e',
            border: 'none',
            borderRadius: 8,
            padding: '0.8rem 2rem',
            fontFamily: 'Outfit',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            width: '100%',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={e => e.target.style.opacity = 0.85}
          onMouseOut={e => e.target.style.opacity = 1}
        >
          Calculate
        </button>
      </div>

      {/* Results */}
      {results && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {/* Mortgage comparison */}
          <h2 style={sectionHead}>Mortgage impact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard label="Current end date" value={toMonthYear(results.origEndDate)} sub={`${formatMonths(results.origMonths)} remaining`} />
            <StatCard label="With overpayment" value={toMonthYear(results.overEndDate)} sub={`${formatMonths(results.over.months)} remaining`} accent />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Time saved" value={formatMonths(results.monthsSaved)} sub="off your mortgage term" accent />
            <StatCard label="Interest saved" value={formatCurrency(results.interestSaved)} sub="in total interest payments" accent />
          </div>

          {/* Savings comparison */}
          <h2 style={sectionHead}>Savings comparison <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'DM Mono', fontWeight: 400 }}>@ 7% avg. annual return</span></h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ ...cardStyle, border: winner === 'A' ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
              {winner === 'A' && <div style={winnerBadge}>Winner</div>}
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Option A — Overpay</div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: '1.8rem', color: winner === 'A' ? 'var(--accent)' : 'var(--text)', marginBottom: '0.4rem' }}>{formatCurrency(results.scenarioA)}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Overpay by {formatCurrency(results.overpayment)}/mo. Once mortgage is paid off {formatMonths(results.monthsSaved)} early, save the full {formatCurrency(results.payment + results.overpayment)}/mo into a stocks & shares ISA for the remaining {formatMonths(results.monthsSaved)}.
              </p>
            </div>

            <div style={{ ...cardStyle, border: winner === 'B' ? '1px solid var(--accent2)' : '1px solid var(--border)' }}>
              {winner === 'B' && <div style={{ ...winnerBadge, background: 'var(--accent2)' }}>Winner</div>}
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Option B — Invest now</div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: '1.8rem', color: winner === 'B' ? 'var(--accent2)' : 'var(--text)', marginBottom: '0.4rem' }}>{formatCurrency(results.scenarioB)}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Keep paying the standard mortgage. Invest the {formatCurrency(results.overpayment)}/mo overpayment amount straight into a stocks & shares ISA for the full {formatMonths(results.origMonths)}.
              </p>
            </div>
          </div>

          {/* Winner summary */}
          <div style={{ background: 'var(--card)', border: `1px solid ${winner === 'A' ? 'var(--accent)' : 'var(--accent2)'}`, borderRadius: 12, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
              <span style={{ fontWeight: 600, color: winner === 'A' ? 'var(--accent)' : 'var(--accent2)' }}>
                Option {winner} comes out ahead
              </span>{' '}
              by {formatCurrency(Math.abs(results.scenarioA - results.scenarioB))} by {toMonthYear(results.origEndDate)}.
              {winner === 'B'
                ? ' In this case, your mortgage interest rate is low enough that investing produces better long-term returns than overpaying.'
                : ' Clearing your mortgage early and then channelling the full payment amount into savings wins out here.'}
            </p>
          </div>

          {/* Disclaimer */}
          <p style={{ marginTop: '2.5rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.8, borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <strong style={{ color: 'var(--text)' }}>Illustrative purposes only.</strong> This calculator is not financial advice. Figures are estimates based on the inputs provided and assume a constant {SAVINGS_RATE * 100}% average annual return on investments — actual returns will vary and are not guaranteed. It does not account for changes in interest rates, early repayment charges, tax treatment of savings, inflation, or individual circumstances. Please consult a qualified financial adviser before making any decisions about your mortgage or investments.
          </p>
        </div>
      )}
    </main>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontFamily: 'DM Mono',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
};

const sectionHead = {
  fontFamily: 'DM Serif Display',
  fontSize: '1.3rem',
  marginBottom: '1rem',
  fontWeight: 400,
};

const cardStyle = {
  background: 'var(--card)',
  borderRadius: 12,
  padding: '1.25rem',
  position: 'relative',
};

const winnerBadge = {
  position: 'absolute',
  top: 12,
  right: 12,
  background: 'var(--accent)',
  color: '#0a0f1e',
  fontSize: '0.65rem',
  fontFamily: 'DM Mono',
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '2px 8px',
  borderRadius: 4,
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontFamily: 'DM Serif Display', fontSize: '1.6rem', color: accent ? 'var(--accent)' : 'var(--text)', marginBottom: '0.2rem' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{sub}</div>
    </div>
  );
}