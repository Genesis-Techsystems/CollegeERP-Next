import { Component, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-run-confirm-modal',
  templateUrl: './run-confirm-modal.component.html',
  styleUrls: ['./run-confirm-modal.component.scss']
})
export class RunConfirmModalComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<RunConfirmModalComponent>) { }

  ngOnInit(): void {
  }
  submit(): void {
  
    this.dialogRef.close('submit');
 
}
}
