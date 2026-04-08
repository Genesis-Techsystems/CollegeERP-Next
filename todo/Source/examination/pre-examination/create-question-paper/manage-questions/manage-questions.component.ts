import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
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
import * as FileSaver from 'file-saver';
import { fuseAnimations } from '@fuse/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatRipple } from '@angular/material/core';

@Component({
  selector: 'app-manage-questions',
  templateUrl: './manage-questions.component.html',
  styleUrls: ['./manage-questions.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations   : fuseAnimations
})
export class ManageQuestionsComponent implements OnInit {
  dataSource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatRipple) ripple: MatRipple;
  @ViewChild('excelAvatar') excelAvatar: ElementRef;

  params: any = {};

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private crudService: CrudService, private dialog: MatDialog,
    private snotifyService: SnotifyService, private _location: Location, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) { }

  ngOnInit(): void {
    this.route.queryParams
    .subscribe(params => {
         this.params = params;
         
        if (!this.isEmptyObject(params)) {
            this.params.CourseCode=params.CourseCode,
            this.params.ExamMonthYear = params.ExamMonthYear;
            this.params.CourseYear = params.CourseYear;
            this.params.subjectcode = params.subjectcode;
            this.params.RegulationCode = params.RegulationCode;
            this.params.ExamDate = params.ExamDate;
            this.params.CourseGroupCode = params.CourseGroupCode;
            this.params.questionPaperId = params.questionPaperId;
            this.params.subjectName = params.subjectName;
        }
    });
    this.dataSource = new MatTableDataSource();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
}

  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  addQuestion(): void{
    this.router.navigate(['admin-examination-management/admin-pre-examinations/create-question-paper/manage-questions/manual-questions'],
    { queryParams: { questionPaperId: this.params.questionPaperId,
        questionpaper_title: this.params.questionpaper_title,
        CourseCode: this.params.CourseCode,
        ExamMonthYear: this.params.ExamMonthYear,
        CourseYear: this.params.CourseYear,
        subjectcode: this.params.subjectcode,
        RegulationCode: this.params.RegulationCode,
        ExamDate: this.params.ExamDate,
        CourseGroupCode: this.params.CourseGroupCode,
        subjectName: this.params.subjectName
     } }

        );
}
questionBank(): void{
  this.router.navigate(['admin-examination-management/admin-pre-examinations/create-question-paper/manage-questions/question-bank'],
  { queryParams: { questionPaperId: this.params.questionPaperId,
    questionpaper_title: this.params.questionpaper_title,
    CourseCode: this.params.CourseCode,
    ExamMonthYear: this.params.ExamMonthYear,
    CourseYear: this.params.CourseYear,
    subjectcode: this.params.subjectcode,
    RegulationCode: this.params.RegulationCode,
    ExamDate: this.params.ExamDate,
    CourseGroupCode: this.params.CourseGroupCode,
    subjectName: this.params.subjectName
} });
}
goBack(): void{
    this.router.navigate(['admin-examination-management/admin-pre-examinations/create-question-paper'], { 
        queryParams: {
            questionPaperId: this.params.questionPaperId,
           CourseCode: this.params.CourseCode,
           ExamMonthYear: this.params.ExamMonthYear,
           CourseYear: this.params.CourseYear,
           subjectcode: this.params.subjectcode,
           RegulationCode: this.params.RegulationCode,
           ExamDate: this.params.ExamDate,
           CourseGroupCode: this.params.CourseGroupCode,
           subjectName:this.params.subjectName

        } 
    });
}
download(): void{
    FileSaver.saveAs('assets/docs/QuestionSheet_bulk_upload.xlsx');
}
upload(event){
}
}
