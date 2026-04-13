import { Component, EventEmitter , ElementRef, OnInit, ViewChild, ViewEncapsulation, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import {Location} from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { CONSTANTS } from 'app/main/common/constants';
import { MatDialog } from '@angular/material/dialog';
import { MatRipple } from '@angular/material/core';
import { FormBuilder } from '@angular/forms';
@Component({
  selector: 'app-print-question-modalanswers',
  templateUrl: './print-question-modalanswers.component.html',
  styleUrls: ['./print-question-modalanswers.component.scss']
})
export class PrintQuestionModalanswersComponent implements OnInit {

  displayedColumns: string[] = ['id','QuestionNumber','QuestionCode','Question','QuestionMarks','ModelAnswer', 'isActive', 'edit'];
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  @ViewChild('excelAvatar') excelAvatar: ElementRef;
  @Output() print = new EventEmitter<string>();

  public formData;
  questions = [];
  marks : [];
  examQuestionpapersmarks :any[] = [];
  examQuestionpapersmarks1 :any[] = [];
  private ExamQuestionPaperMarksCrudUrl = CONSTANTS.ExamQuestionPaperMarksCrudUrl;
  params: any = {};
  examQuestionpapermarks: any[];
  questionPaper: any= [];

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, private dialog: MatDialog,
    private snotifyService: SnotifyService, private _location: Location, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) { }


  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
        this.params = params;
        this.questionPaper=JSON.parse(this.params.questionPaper)
        
       
    });
    this.getExamQuestionpapermarks();

  }

  getExamQuestionpapermarks(): void{
    this.examQuestionpapersmarks1=[]
    this.examQuestionpapersmarks =[]
    /*----------- ExamQuestionpapers -----------*/
    this.crudService.ListDetails(this.ExamQuestionPaperMarksCrudUrl)
        .subscribe(result => {
           this.spinner.hide();
           if (result.statusCode === 200){
                if (result.data.resultList && result.data.resultList !== '') {
                    this.examQuestionpapersmarks = result.data.resultList;
                    for(let i=0;i<this.examQuestionpapersmarks.length;i++){
                        if(this.examQuestionpapersmarks[i].questionPaperId==this.params.questionPaperId){                            
                            this.examQuestionpapersmarks1.push(this.examQuestionpapersmarks[i])                            
                        }
                    }
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
           }else {
                this.snotifyService.error(result.message, 'Error!');
         }
        }, error => {
            this.spinner.hide();
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
    }
   public printPage(_printsection:any) {
      window.print();
    }
    printBack(){
      this.router.navigate(['admin-examination-management/evaluation-process/exam-question-paper-marks/manage-questions'] , 
      { queryParams: { questionPaperId: this.params.questionPaperId,
        examName:this.params.exam_name,
        questionpaper_title: this.params.questionpaper_title, 
        courseId: this.params.courseId,
        academicYearId:this.params.academicYearId,
        subjectId: this.params.subjectId,
        examId: this.params.examId,
        regulationId: this.params.regulationId,
         subjectName:this.params.subjectName,
         subjectCode : this.params.subjectCode
  }}
      );
      
    }

}
