import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-evaluator-answer-sheets',
  templateUrl: './evaluator-answer-sheets.component.html',
  styleUrls: ['./evaluator-answer-sheets.component.scss']
})
export class EvaluatorAnswerSheetsComponent implements OnInit {

  searchText = '';
  details: any;
  studentlist: any;

  constructor(private dialogRef: MatDialogRef<EvaluatorAnswerSheetsComponent>,
    @Inject(MAT_DIALOG_DATA) public data) { }

  ngOnInit(): void {
    this.details = this.data.details
    this.studentlist = this.data.studentList

  }

}
