import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
@Component({
  selector: 'app-print-consolidated-memo',
  templateUrl: './print-consolidated-memo.component.html',
  styleUrls: ['./print-consolidated-memo.component.scss']
})
export class PrintConsolidatedMemoComponent implements OnInit {
  params: any;
  data: any;
  examdata:any;
  MINIO = CONSTANTS.MINIO;


  constructor( private route:ActivatedRoute,private router:Router) { }

  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
      this.params=params
      
       this.data=JSON.parse(params.data),
       this.examdata=JSON.parse(params.examdata),

       console.log(this.data);
       
});
  }

  printPage(_printsection:any) {
    window.print();
  }
  printBack(){
    this.router.navigate(['/admin-examination-management/admin-exam-reports/consolidated-marks-report'],
    {queryParams:{

    }})
    
  }
}
