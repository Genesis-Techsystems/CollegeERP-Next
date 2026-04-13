import { Component, OnInit } from '@angular/core';
import { ParametersService } from 'app/main/services/parameters.service';
import {Location} from '@angular/common';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CONSTANTS } from 'app/main/common/constants';
import { Router } from '@angular/router';
@Component({
  selector: 'app-additional-exam-form',
  templateUrl: './additional-exam-form.component.html',
  styleUrls: ['./additional-exam-form.component.scss']
})
export class AdditionalExamFormComponent implements OnInit {

  SemisterList =[
    {id:'ISEM'    , value:'I'},
    {id:'IISEM'   , value:'II'},
    {id:'IIISEM'  , value:'III'},
    {id:'IVSEM'   , value:'IV'},
    {id:'VSEM'    , value:'V'},
    {id:'VISEM'   , value:'VI'},
    {id:'VIISEM'  , value:'VII'},
    {id:'VIIISEM' , value:'VIII'},
  
  ]

  public MINIO = CONSTANTS.MINIO;


  studentDetails:any=[];
  paymentForfee: any;
  studentSubjects: any;
  orgCode;

  constructor(private genericFunctions: GenericFunctions,private parameterservice:ParametersService,private _location: Location,
              private router:Router
  ) {
      this.orgCode = localStorage.getItem('orgCode');
   }
  public Date;
  ngOnInit(): void {
    this.Date = new Date();
    if(this.parameterservice.Studentexamfeereceipt){
      this.studentDetails = this.parameterservice.Studentexamfeereceipt;
      
    }else{
      this.goBack();
    }
    this.studentSubjects = this.studentDetails.examStudentDTOs[0]
    
  }
  numToWords(num: any): any {
    
    var a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n: any = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str;
  }
  currencySymbol(input) {
    if (! isNaN(input)) {
        var currencySymbol = '₹';
        //var output = Number(input).toLocaleString('en-IN');   <-- This method is not working fine in all browsers!          
        var result = input.toString().split('.');
        var lastThree = result[0].substring(result[0].length - 3);
        var otherNumbers = result[0].substring(0, result[0].length - 3);
        if (otherNumbers != '')
            lastThree = ',' + lastThree;
        var output = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
       
        if (result.length > 1) {
            output += "." + result[1];
        }            

        return  output;
    }
}
  printSection(_printsection:any){
      window.print();
  }
  goBack(): void{
    this.router.navigate(['admin-examination-management/admin-pre-examinations/exam-fee-collection'],{
      queryParams:{
        studentId:this.studentDetails?.studentId,
        stdRollNumber:this.studentDetails?.stdRollNumber,
        examId:this.studentDetails?.examId,
        courseYearId:this.studentDetails?.courseYearId
      }
    }
    )
  }
}