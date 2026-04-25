import { useEffect, useState } from "react";
import axios from "axios";

export default function PurchaseReport() {

  const [report,setReport] = useState([]);
  const [summary,setSummary] = useState({});
  const [loading,setLoading] = useState(false);

  const [vendor,setVendor] = useState("");
  const [from,setFrom] = useState("all");
  const [search,setSearch] = useState("");

  const fetchReport = async () => {

    try{

      setLoading(true);

      const res = await axios.get(
        "http://localhost:8000/api/reports/purchaseReports",
        {
          params:{
            vendor_id:vendor,
            from:from
          }
        }
      );

      if(res.data.success){

        setReport(res.data.data);
        setSummary(res.data.summary);

      }

      setLoading(false);

    }catch(err){

      console.log(err);
      setLoading(false);

    }

  };

  useEffect(()=>{
    fetchReport();
  },[vendor,from]);



  const exportExcel = () => {

    window.open(
      `http://localhost:8000/api/reports/purchaseReports?format=excel&vendor_id=${vendor}&from=${from}`,
      "_blank"
    );

  };



  const filteredData = report.filter(r =>
    r.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );



  const formatINR = (amount) =>

    new Intl.NumberFormat("en-IN",{
      style:"currency",
      currency:"INR"
    }).format(amount || 0);



  return(

<div style={{padding:"20px"}}>

<h2 style={{marginBottom:"20px"}}>Purchase Report</h2>


{/* FILTER BAR */}

<div style={{
display:"flex",
gap:"15px",
marginBottom:"20px",
alignItems:"center"
}}>

<input
type="text"
placeholder="Search invoice / vendor"
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
padding:"8px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
/>


<select
value={from}
onChange={(e)=>setFrom(e.target.value)}
style={{
padding:"8px",
border:"1px solid #ddd",
borderRadius:"6px"
}}
>

<option value="all">All Time</option>
<option value="1d">Today</option>
<option value="1w">Last 7 Days</option>
<option value="1m">Last 1 Month</option>
<option value="3m">Last 3 Months</option>
<option value="6m">Last 6 Months</option>

</select>


<button
onClick={exportExcel}
style={{
background:"#4CAF50",
color:"#fff",
border:"none",
padding:"8px 14px",
borderRadius:"6px",
cursor:"pointer"
}}
>

Export Excel

</button>


</div>



{/* SUMMARY CARDS */}

<div style={{
display:"flex",
gap:"20px",
marginBottom:"25px",
flexWrap:"wrap"
}}>

<Card title="Total Taxable" value={formatINR(summary.taxable_total)} />
<Card title="Total Tax" value={formatINR(summary.total_tax)} />
<Card title="Grand Total" value={formatINR(summary.grand_total)} />
<Card title="Total Paid" value={formatINR(summary.paid_total)} />
<Card title="Total Balance" value={formatINR(summary.balance_total)} />

</div>



{/* TABLE */}

<div style={{
background:"#fff",
borderRadius:"8px",
boxShadow:"0 2px 6px rgba(0,0,0,0.08)",
overflow:"auto"
}}>

<table style={{
width:"100%",
borderCollapse:"collapse"
}}>

<thead>

<tr style={{background:"#f3f3f3"}}>

<th>Date</th>
<th>Invoice</th>
<th>Vendor</th>
<th>GSTIN</th>
<th>State</th>

<th>Taxable</th>
<th>CGST</th>
<th>SGST</th>
<th>IGST</th>

<th>Total Tax</th>
<th>Total</th>

<th>Paid</th>
<th>Balance</th>

<th>Status</th>

</tr>

</thead>

<tbody>

{loading &&

<tr>

<td colSpan="14" style={{textAlign:"center",padding:"20px"}}>

Loading...

</td>

</tr>

}



{!loading && filteredData.map((r,i)=>(

<tr key={i} style={{borderTop:"1px solid #eee"}}>

<td>{new Date(r.purchase_date).toLocaleDateString()}</td>

<td>{r.invoice_number}</td>

<td>{r.vendor_name}</td>

<td>{r.gstin}</td>

<td>{r.state}</td>

<td>{formatINR(r.taxable_amount)}</td>

<td>{formatINR(r.cgst)}</td>

<td>{formatINR(r.sgst)}</td>

<td>{formatINR(r.igst)}</td>

<td>{formatINR(r.total_tax)}</td>

<td>{formatINR(r.grand_total)}</td>

<td>{formatINR(r.amount_paid)}</td>

<td>{formatINR(r.balance_amount)}</td>

<td>

<span style={{
padding:"4px 8px",
borderRadius:"6px",
background:
r.payment_status==="Paid"
? "#d4edda"
: r.payment_status==="Partial"
? "#fff3cd"
: "#f8d7da",
color:"#333",
fontSize:"12px"
}}>

{r.payment_status}

</span>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

  );

}



function Card({title,value}){

return(

<div style={{

background:"#fff",
padding:"15px",
borderRadius:"8px",
boxShadow:"0 2px 6px rgba(0,0,0,0.08)",
minWidth:"180px"

}}>

<p style={{fontSize:"12px",color:"#777"}}>

{title}

</p>

<h3 style={{marginTop:"5px"}}>

{value}

</h3>

</div>

)

}