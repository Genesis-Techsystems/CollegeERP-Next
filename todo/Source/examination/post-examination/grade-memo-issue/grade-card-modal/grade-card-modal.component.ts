import { Component, OnInit,VERSION } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
@Component({
  selector: 'app-grade-card-modal',
  templateUrl: './grade-card-modal.component.html',
  styleUrls: ['./grade-card-modal.component.scss']
})
export class GradeCardModalComponent implements OnInit {

  SemisterList =[
    {id: 1 , value:'I Semester'},
    {id: 2 , value:'II Semester'},
    {id: 3 , value:'III Semester'},
    {id: 4 , value:'IV Semester'},
    {id: 5 , value:'V Semester'},
    {id: 6 , value:'VI Semester'},
    {id: 7 , value:'VII Semester'},
    {id: 8 , value:'VIII Semester'},
  ]

  name = 'Angular ' + VERSION.major;
  studentName: any;
  rollnumer: any;
  data: any;
  MINIO = CONSTANTS.MINIO;
  params: any;
  examid: any;
  studentId: any;
  resultListDetails=[];
  student=[];
  orgCode: string;
  isPrintMode: boolean = false;
  mainList=[];
  single: boolean = false;
  bulk: boolean =false;
  memoDate: any;
  universityCode = '';
  totalRows = 12;

  constructor( private route:ActivatedRoute,private router:Router) { }

  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
      this.params=params
      this.memoDate = this.params.memoDate;
      console.log(this.params,'this.params');
      if( this.params.bulk == 'false'){
        this.resultListDetails = JSON.parse(params.data) ,
        this.student = JSON.parse(params.studentData) 
        this.single = true,
        this.bulk=false,
        this.universityCode = params.universityCode,
        console.log(this.universityCode,"this.universityCode");
        console.log( this.resultListDetails,' this.resultListDetailss');
      }else {
        this.mainList = JSON.parse(params.data)
        this.bulk = true,
        this.single = false,
        this.universityCode = params.universityCode,
        console.log(this.universityCode,"this.universityCode");
        console.log(this.mainList,'this.mainList');
      }
    
      // this.studentId = this.params.studentId
      
    });
    this.orgCode = localStorage.getItem('orgCode')
  }
  printPage() {
    this.isPrintMode = true;
    setTimeout(() => {
      window.print();
      this.isPrintMode = false;
    }, 100);
  }
  getTotalCreditsRegistered(): number {
    let totalCreditsRegistered = 0;
    for (const result of this.resultListDetails) {
      totalCreditsRegistered += result.credits_registered;
    }
    return totalCreditsRegistered;
  }
  getTotalCreditsAssigned(): number {
    let totalCreditsAssigned = 0;
    for (const result of this.resultListDetails) {
      totalCreditsAssigned += result.credits;
    }
    return totalCreditsAssigned;
  }
  getMultiplesOfGiCi(): number {
    let multiplesOfGiCi = 0;
    for (const result of this.resultListDetails) {
      multiplesOfGiCi += result.ci_gi_points;
    }
    return multiplesOfGiCi;
  }
  getTotalMarks(): number {
    let TotalMarks = 0;
    for (const result of this.resultListDetails) {
      TotalMarks += result.totalMarks;
    }
    return TotalMarks;
  }
  getTotalMaxMarks(): number {
    let totalMaxMarks = 0;
    for (const result of this.resultListDetails) {
      totalMaxMarks += result.totalMaxMarks;
    }
    return totalMaxMarks;
  }
  getEmptyRows(list: any[]): any[] {
    const emptyRowCount = this.totalRows - list.length;
    return new Array(emptyRowCount > 0 ? emptyRowCount : 0);  // Return an array of empty rows
  }
  numberToWords(num: any): string {
  if (num === null || num === undefined) return '';

  const parts = num.toString().split('.');

  const ones: any = [
    'Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'
  ];

  let words = ones[parseInt(parts[0])] || '';

  if (parts.length > 1) {
    let decimalPart = parts[1]
      .split('')
      .map((d: any) => ones[parseInt(d)])
      .join(' ');

    words += ' Point ' + decimalPart;
  }

  return words;
}
  Back(){
    this.router.navigate(['admin-examination-management/admin-post-examination/grade-memo-issue'],
      
    {queryParams : {
      examId : this.params.examId,
      studentId : this.params.studentId,
      courseId: this.params.courseId,
      collegeId: this.params.collegeId,
      academicYearId: this.params.academicYearId,
      courseYearId: this.params.courseYearId,
      courseGroupId: this.params.courseGroupId
    }}
    )
    
  }

}