import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-manual-view-model',
  templateUrl: './manual-view-model.component.html',
  styleUrls: ['./manual-view-model.component.scss']
})
export class ManualViewModelComponent implements OnInit {
  displayedColumns: string[] = ['id','evaluatorName','email', 'examTimetableDetId', 'questionPaperId'];
  dataSource: MatTableDataSource<any>;
  examEvaluationList= [
    {evaluatorName:'srinath',email:'srinath@gmail.com',examTimetableDetId: '3244554455', questionPaperId: '60', },
    {evaluatorName:'srinath',email:'srinath@gmail.com',examTimetableDetId: '2435435444', questionPaperId: '50', },
    {evaluatorName:'srinath',email:'srinath@gmail.com',examTimetableDetId: '4545454546', questionPaperId: '40', },
    {evaluatorName:'srinath',email:'srinath@gmail.com',examTimetableDetId: '2567568456', questionPaperId: '30', },
   
  ];
  constructor( private dialogRef: MatDialogRef<ManualViewModelComponent>,
    @Inject(MAT_DIALOG_DATA) private data, ) { }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<any>(this.examEvaluationList);
  }
 

}
